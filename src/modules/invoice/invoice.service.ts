import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerException,
  NotFoundException,
} from '../../common/exceptions';
import { INVOICE_MESSAGES } from '../../common/constants';
import { PaginatedResult } from '../../common/interfaces';
import { logger, maskEmail } from '../../common/utils';
import { ProfileStatus } from '../../common/enums/status.enum';
import { IInvoiceAttributes, Invoice, TradieProfile } from '../../models';
import { EmailService } from '../../services/email.service';
import { InvoiceRepository } from './invoice.repository';
import {
  DEFAULT_DISCLAIMER,
  DEFAULT_INVOICE_TITLE,
  InvoiceAiDraft,
  InvoiceClientOption,
  InvoiceDelivery,
  InvoiceInputDto,
  InvoiceListQuery,
  LineItemDto,
} from './invoice.interface';
import { computeDueDate, computeInvoiceTotals, computeLineTotal, todayInInvoiceTimezone } from './invoice.totals';
import { buildInvoiceEmail } from './invoice.email';
import { generateInvoiceDraft } from './invoice.ai';
import { serializeInvoice, serializeInvoiceSummary } from './invoice.serializer';

type SerializedInvoice = ReturnType<typeof serializeInvoice>;

const EDITABLE_STATUSES = new Set(['draft', 'sent']);

/** '' and null both clear an optional text field. */
const blankToNull = (value: string | null): string | null => value?.trim() || null;

export class InvoiceService {
  private repo: InvoiceRepository;
  private emailService: EmailService;

  constructor() {
    this.repo = new InvoiceRepository();
    this.emailService = new EmailService();
  }

  /**
   * Invoicing is a provider feature: it keys off an approved tradie profile
   * rather than the token role, so a customer whose profile was approved can
   * invoice before their role is switched.
   */
  async requireTradieProfile(userId: string): Promise<TradieProfile> {
    const profile = await this.repo.findTradieProfileByUserId(userId);
    if (!profile || profile.profileStatus !== ProfileStatus.APPROVED) {
      throw new ForbiddenException(INVOICE_MESSAGES.TRADIE_REQUIRED);
    }
    return profile;
  }

  async list(userId: string, query: InvoiceListQuery): Promise<PaginatedResult<ReturnType<typeof serializeInvoiceSummary>>> {
    const profile = await this.requireTradieProfile(userId);
    const result = await this.repo.list(profile.id, query);
    return { data: result.data.map(serializeInvoiceSummary), meta: result.meta };
  }

  async get(userId: string, id: string): Promise<SerializedInvoice> {
    const profile = await this.requireTradieProfile(userId);
    const invoice = await this.findOwnedOrThrow(id, profile.id);
    return this.toResponse(invoice, profile);
  }

  async create(userId: string, dto: InvoiceInputDto): Promise<SerializedInvoice> {
    const profile = await this.requireTradieProfile(userId);
    await this.assertClientUser(dto.clientUserId, userId);

    const lineItems = dto.lineItems ?? [];
    const attrs = this.buildAttributes(dto, {
      title: DEFAULT_INVOICE_TITLE,
      issueDateMode: 'date_sent',
      issuedDate: null,
      paymentTerms: 'due_on_receipt',
      discountType: 'amount',
      discountValue: 0,
      taxRate: 0,
      disclaimer: DEFAULT_DISCLAIMER,
    } as IInvoiceAttributes, lineItems);

    const id = await this.repo.createWithLineItems(
      { ...attrs, tradieProfileId: profile.id, status: 'draft', currency: 'AUD' } as IInvoiceAttributes,
      this.toLineItemRows(lineItems),
    );
    return this.get(userId, id);
  }

  async update(userId: string, id: string, dto: InvoiceInputDto): Promise<SerializedInvoice> {
    const profile = await this.requireTradieProfile(userId);
    const invoice = await this.findOwnedOrThrow(id, profile.id);
    if (!EDITABLE_STATUSES.has(invoice.status)) {
      throw new ConflictException(INVOICE_MESSAGES.NOT_EDITABLE);
    }
    if (dto.clientUserId !== undefined) await this.assertClientUser(dto.clientUserId, userId);

    const lineItems: LineItemDto[] =
      dto.lineItems ??
      (invoice.lineItems ?? []).map((item) => ({
        name: item.name,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      }));

    const attrs = this.buildAttributes(dto, invoice.get({ plain: true }) as IInvoiceAttributes, lineItems);
    await this.repo.updateWithLineItems(
      invoice,
      attrs,
      dto.lineItems ? this.toLineItemRows(dto.lineItems) : undefined,
    );
    return this.get(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const profile = await this.requireTradieProfile(userId);
    const invoice = await this.findOwnedOrThrow(id, profile.id);
    if (invoice.status !== 'draft') {
      throw new ConflictException(INVOICE_MESSAGES.ONLY_DRAFT_DELETABLE);
    }
    await this.repo.delete(invoice);
  }

  /**
   * Finalises the invoice: fixes the issue date, derives the due date and emails
   * it when there is an address to send to. With no address it is still marked
   * sent so the tradie can hand it over themselves. Re-sending a sent invoice
   * re-emails it without moving its dates.
   */
  async send(userId: string, id: string): Promise<{ invoice: SerializedInvoice; delivery: InvoiceDelivery }> {
    const profile = await this.requireTradieProfile(userId);
    const invoice = await this.findOwnedOrThrow(id, profile.id);
    if (!EDITABLE_STATUSES.has(invoice.status)) {
      throw new ConflictException(INVOICE_MESSAGES.NOT_EDITABLE);
    }
    if (!invoice.lineItems?.length) throw new BadRequestException(INVOICE_MESSAGES.NO_LINE_ITEMS);
    if (!invoice.clientFirstName && !invoice.clientLastName) {
      throw new BadRequestException(INVOICE_MESSAGES.CLIENT_REQUIRED);
    }
    if (invoice.issueDateMode === 'custom' && !invoice.issuedDate) {
      throw new BadRequestException(INVOICE_MESSAGES.CUSTOM_DATE_REQUIRED);
    }

    const issuedDate =
      invoice.issueDateMode === 'custom' || invoice.status === 'sent'
        ? (invoice.issuedDate ?? todayInInvoiceTimezone())
        : todayInInvoiceTimezone();
    const finalised = {
      issuedDate,
      dueDate: computeDueDate(issuedDate, invoice.paymentTerms),
      status: 'sent' as const,
      sentAt: new Date(),
    };

    const { recipient, displayTo } = await this.resolveRecipient(invoice);
    if (recipient) {
      // Email before committing so a failed delivery leaves the invoice unchanged.
      invoice.set(finalised);
      try {
        await this.emailService.sendRaw({ to: recipient, ...buildInvoiceEmail(invoice, profile) });
      } catch (err) {
        logger.error('invoice_email_failed', { invoiceId: invoice.id, error: (err as Error).message });
        throw new InternalServerException(INVOICE_MESSAGES.EMAIL_FAILED);
      }
    }

    await this.repo.updateWithLineItems(invoice, finalised, undefined);
    return {
      invoice: await this.get(userId, id),
      delivery: recipient ? { method: 'email', to: displayTo } : { method: 'manual', to: null },
    };
  }

  async markPaid(userId: string, id: string): Promise<SerializedInvoice> {
    const profile = await this.requireTradieProfile(userId);
    const invoice = await this.findOwnedOrThrow(id, profile.id);
    if (invoice.status !== 'sent') throw new ConflictException(INVOICE_MESSAGES.NOT_SENT);
    await this.repo.updateWithLineItems(invoice, { status: 'paid', paidAt: new Date() }, undefined);
    return this.get(userId, id);
  }

  /**
   * Clients for "Select Existing Client": people this tradie already chats with
   * in the app, plus clients from earlier invoices. Chat users' contact details
   * stay private (the spec only lets customers see tradies' details); sending
   * to them goes to their account email server-side.
   */
  async listClients(userId: string, search?: string): Promise<InvoiceClientOption[]> {
    const profile = await this.requireTradieProfile(userId);
    const [partners, pastInvoices] = await Promise.all([
      this.repo.findChatPartners(userId),
      this.repo.findRecentClientDetails(profile.id),
    ]);

    const options = new Map<string, InvoiceClientOption>();

    // Earlier invoices first: the details the tradie typed are the most useful.
    for (const inv of pastInvoices) {
      const name = [inv.clientFirstName, inv.clientLastName].filter(Boolean).join(' ');
      if (!name) continue;
      const key = inv.clientUserId ?? `invoice:${(inv.clientEmail ?? inv.clientPhone ?? name).toLowerCase()}`;
      if (options.has(key)) continue;
      options.set(key, {
        key,
        clientUserId: inv.clientUserId,
        firstName: inv.clientFirstName ?? '',
        lastName: inv.clientLastName ?? '',
        address: inv.clientAddress,
        phone: inv.clientPhone,
        email: inv.clientEmail,
        avatar: null,
        hasAccountEmail: false,
        source: 'invoice',
      });
    }

    for (const user of partners) {
      const existing = options.get(user.id);
      if (existing) {
        existing.avatar = user.avatar;
        existing.hasAccountEmail = !!user.email;
        continue;
      }
      const [firstName, ...rest] = (user.name ?? '').trim().split(/\s+/);
      options.set(user.id, {
        key: user.id,
        clientUserId: user.id,
        firstName: firstName ?? '',
        lastName: rest.join(' '),
        address: null,
        phone: null,
        email: null,
        avatar: user.avatar,
        hasAccountEmail: !!user.email,
        source: 'chat',
      });
    }

    const term = search?.trim().toLowerCase();
    const all = [...options.values()].filter((o) => o.firstName || o.lastName);
    return term
      ? all.filter((o) => `${o.firstName} ${o.lastName} ${o.email ?? ''}`.toLowerCase().includes(term))
      : all;
  }

  async aiDraft(userId: string, prompt: string): Promise<InvoiceAiDraft> {
    await this.requireTradieProfile(userId);
    return generateInvoiceDraft(prompt, userId);
  }

  // ─── helpers ──────────────────────────────────────────────────────────────

  private async findOwnedOrThrow(id: string, tradieProfileId: string): Promise<Invoice> {
    const invoice = await this.repo.findOwned(id, tradieProfileId);
    if (!invoice) throw new NotFoundException(INVOICE_MESSAGES.NOT_FOUND);
    return invoice;
  }

  private async toResponse(invoice: Invoice, profile: TradieProfile): Promise<SerializedInvoice> {
    let hasAccountEmail = false;
    if (invoice.clientUserId) {
      const user = await this.repo.findUserById(invoice.clientUserId);
      hasAccountEmail = !!user?.email;
    }
    return serializeInvoice(invoice, profile, { hasAccountEmail });
  }

  private async assertClientUser(clientUserId: string | null | undefined, userId: string): Promise<void> {
    if (!clientUserId) return;
    if (clientUserId === userId) throw new BadRequestException('You cannot invoice yourself');
    const user = await this.repo.findUserById(clientUserId);
    if (!user || user.status !== 'active') throw new BadRequestException('Selected client no longer exists');
  }

  private async resolveRecipient(invoice: Invoice): Promise<{ recipient: string | null; displayTo: string | null }> {
    if (invoice.clientEmail) return { recipient: invoice.clientEmail, displayTo: invoice.clientEmail };
    if (invoice.clientUserId) {
      const user = await this.repo.findUserById(invoice.clientUserId);
      if (user?.email) return { recipient: user.email, displayTo: maskEmail(user.email) };
    }
    return { recipient: null, displayTo: null };
  }

  /** Merges the DTO over `base` and recomputes every derived money/date field. */
  private buildAttributes(
    dto: InvoiceInputDto,
    base: IInvoiceAttributes,
    lineItems: LineItemDto[],
  ): Partial<IInvoiceAttributes> {
    const text = (next: string | null | undefined, current: string | null | undefined) =>
      next === undefined ? (current ?? null) : blankToNull(next);

    const merged = {
      clientUserId: dto.clientUserId !== undefined ? dto.clientUserId : base.clientUserId ?? null,
      clientFirstName: text(dto.clientFirstName, base.clientFirstName),
      clientLastName: text(dto.clientLastName, base.clientLastName),
      clientAddress: text(dto.clientAddress, base.clientAddress),
      clientPhone: text(dto.clientPhone, base.clientPhone),
      clientEmail: text(dto.clientEmail, base.clientEmail),
      title: dto.title ?? base.title,
      issueDateMode: dto.issueDateMode ?? base.issueDateMode,
      issuedDate: dto.issuedDate !== undefined ? dto.issuedDate : base.issuedDate,
      paymentTerms: dto.paymentTerms ?? base.paymentTerms,
      discountType: dto.discountType ?? base.discountType,
      discountValue: dto.discountValue ?? Number(base.discountValue),
      taxRate: dto.taxRate ?? Number(base.taxRate),
      clientMessage: text(dto.clientMessage, base.clientMessage),
      disclaimer: text(dto.disclaimer, base.disclaimer),
    };

    if (merged.discountType === 'percent' && Number(merged.discountValue) > 100) {
      throw new BadRequestException('A percentage discount cannot exceed 100%');
    }

    // "Date sent" drafts get their dates when sent; custom dates are fixed now.
    // A sent invoice keeps its issue date unless the tradie sets a custom one.
    const issuedDate =
      merged.issueDateMode === 'custom'
        ? merged.issuedDate
        : base.status === 'sent'
          ? base.issuedDate
          : null;
    const dueDate = issuedDate ? computeDueDate(issuedDate, merged.paymentTerms) : null;

    const totals = computeInvoiceTotals({
      lineItems,
      discountType: merged.discountType,
      discountValue: Number(merged.discountValue),
      taxRate: Number(merged.taxRate),
    });

    return {
      ...merged,
      issuedDate,
      dueDate,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      total: totals.total,
    };
  }

  private toLineItemRows(lineItems: LineItemDto[]) {
    return lineItems.map((item) => ({
      name: item.name.trim(),
      description: item.description?.trim() || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: computeLineTotal(item.quantity, item.unitPrice),
    }));
  }
}
