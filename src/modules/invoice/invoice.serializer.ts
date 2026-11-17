import { Invoice, TradieProfile } from '../../models';
import { formatInvoiceNumber, todayInInvoiceTimezone } from './invoice.totals';

const money = (value: string | number): number => Number(value);

export function clientDisplayName(invoice: Pick<Invoice, 'clientFirstName' | 'clientLastName'>): string {
  return [invoice.clientFirstName, invoice.clientLastName].filter(Boolean).join(' ').trim();
}

function isOverdue(invoice: Invoice): boolean {
  return invoice.status === 'sent' && !!invoice.dueDate && invoice.dueDate < todayInInvoiceTimezone();
}

export function serializeInvoiceSummary(invoice: Invoice) {
  return {
    id: invoice.id,
    number: formatInvoiceNumber(invoice.sequenceNumber),
    status: invoice.status,
    isOverdue: isOverdue(invoice),
    clientName: clientDisplayName(invoice),
    title: invoice.title,
    total: money(invoice.total),
    currency: invoice.currency,
    issuedDate: invoice.issuedDate,
    dueDate: invoice.dueDate,
    sentAt: invoice.sentAt,
    paidAt: invoice.paidAt,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

export function serializeInvoice(
  invoice: Invoice,
  profile: TradieProfile,
  options: { hasAccountEmail: boolean },
) {
  const lineItems = [...(invoice.lineItems ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    ...serializeInvoiceSummary(invoice),
    client: {
      userId: invoice.clientUserId,
      firstName: invoice.clientFirstName ?? '',
      lastName: invoice.clientLastName ?? '',
      address: invoice.clientAddress,
      phone: invoice.clientPhone,
      email: invoice.clientEmail,
      hasAccountEmail: options.hasAccountEmail,
    },
    issueDateMode: invoice.issueDateMode,
    paymentTerms: invoice.paymentTerms,
    discountType: invoice.discountType,
    discountValue: money(invoice.discountValue),
    taxRate: money(invoice.taxRate),
    subtotal: money(invoice.subtotal),
    discountAmount: money(invoice.discountAmount),
    taxAmount: money(invoice.taxAmount),
    clientMessage: invoice.clientMessage,
    disclaimer: invoice.disclaimer,
    lineItems: lineItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: money(item.quantity),
      unitPrice: money(item.unitPrice),
      total: money(item.total),
    })),
    business: {
      name: profile.businessName ?? profile.user?.name ?? '',
      abn: profile.abn || null,
      address: profile.businessLocation ?? null,
      phone: profile.user?.phone ?? null,
      email: profile.user?.email ?? null,
      website: profile.website ?? null,
    },
  };
}
