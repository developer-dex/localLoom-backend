import { Op, Transaction, WhereOptions, UniqueConstraintError } from 'sequelize';
import { sequelize } from '../../config/database';
import {
  Conversation,
  IInvoiceAttributes,
  IInvoiceCreationAttributes,
  IInvoiceLineItemCreationAttributes,
  Invoice,
  InvoiceLineItem,
  TradieProfile,
  User,
} from '../../models';
import { PaginatedResult } from '../../common/interfaces';
import { buildPaginationMeta } from '../../common/utils';
import { InvoiceListQuery } from './invoice.interface';

type LineItemRow = Omit<IInvoiceLineItemCreationAttributes, 'invoiceId'>;

const lineItemOrder: [string, string, string] = ['lineItems', 'sortOrder', 'ASC'];

export class InvoiceRepository {
  async findTradieProfileByUserId(userId: string): Promise<TradieProfile | null> {
    return TradieProfile.findOne({
      where: { userId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone', 'email'] }],
    });
  }

  async findOwned(id: string, tradieProfileId: string): Promise<Invoice | null> {
    return Invoice.findOne({
      where: { id, tradieProfileId },
      include: [{ model: InvoiceLineItem, as: 'lineItems' }],
      order: [lineItemOrder],
    });
  }

  /**
   * Creates the invoice with the next per-tradie sequence number. Two drafts
   * created at the same instant can race for a number; the unique index
   * rejects the loser, which simply retries with the next value.
   */
  async createWithLineItems(
    attrs: Omit<IInvoiceCreationAttributes, 'sequenceNumber'>,
    lineItems: LineItemRow[],
  ): Promise<string> {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; ; attempt++) {
      try {
        return await sequelize.transaction(async (transaction) => {
          const last = (await Invoice.max('sequenceNumber', {
            where: { tradieProfileId: attrs.tradieProfileId },
            transaction,
          })) as number | null;

          const invoice = await Invoice.create(
            { ...attrs, sequenceNumber: (last ?? 0) + 1 },
            { transaction },
          );
          await this.insertLineItems(invoice.id, lineItems, transaction);
          return invoice.id;
        });
      } catch (err) {
        if (err instanceof UniqueConstraintError && attempt < MAX_ATTEMPTS) continue;
        throw err;
      }
    }
  }

  async updateWithLineItems(
    invoice: Invoice,
    attrs: Partial<IInvoiceAttributes>,
    lineItems: LineItemRow[] | undefined,
  ): Promise<void> {
    await sequelize.transaction(async (transaction) => {
      await invoice.update(attrs, { transaction });
      if (lineItems) {
        await InvoiceLineItem.destroy({ where: { invoiceId: invoice.id }, transaction });
        await this.insertLineItems(invoice.id, lineItems, transaction);
      }
    });
  }

  async delete(invoice: Invoice): Promise<void> {
    await invoice.destroy();
  }

  async list(tradieProfileId: string, query: InvoiceListQuery): Promise<PaginatedResult<Invoice>> {
    const { page, limit, status, search } = query;
    const where: WhereOptions<IInvoiceAttributes> & Record<string | symbol, unknown> = { tradieProfileId };
    if (status) where.status = status;
    if (search) {
      const term = `%${search}%`;
      where[Op.or] = [
        { clientFirstName: { [Op.iLike]: term } },
        { clientLastName: { [Op.iLike]: term } },
        { title: { [Op.iLike]: term } },
      ];
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit,
    });

    return { data: rows, meta: buildPaginationMeta(count, page, limit) };
  }

  /** Everyone this tradie has an in-app conversation with (they reached out, or vice versa). */
  async findChatPartners(userId: string): Promise<User[]> {
    const conversations = await Conversation.findAll({
      where: { [Op.or]: [{ fromUserId: userId }, { toUserId: userId }] },
      include: [
        { model: User, as: 'fromUser', attributes: ['id', 'name', 'email', 'avatar', 'status'] },
        { model: User, as: 'toUser', attributes: ['id', 'name', 'email', 'avatar', 'status'] },
      ],
      order: [['updatedAt', 'DESC']],
      limit: 200,
    });

    const partners = new Map<string, User>();
    for (const conversation of conversations) {
      const other = conversation.fromUserId === userId ? conversation.toUser : conversation.fromUser;
      if (other && other.status === 'active' && !partners.has(other.id)) {
        partners.set(other.id, other);
      }
    }
    return [...partners.values()];
  }

  /** Recent invoices, newest first, used to offer previously billed clients again. */
  async findRecentClientDetails(tradieProfileId: string): Promise<Invoice[]> {
    return Invoice.findAll({
      where: { tradieProfileId },
      attributes: [
        'clientUserId',
        'clientFirstName',
        'clientLastName',
        'clientAddress',
        'clientPhone',
        'clientEmail',
        'updatedAt',
      ],
      order: [['updatedAt', 'DESC']],
      limit: 200,
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return User.findByPk(id, { attributes: ['id', 'name', 'email', 'status'] });
  }

  private async insertLineItems(
    invoiceId: string,
    lineItems: LineItemRow[],
    transaction: Transaction,
  ): Promise<void> {
    if (lineItems.length === 0) return;
    await InvoiceLineItem.bulkCreate(
      lineItems.map((item, index) => ({ ...item, invoiceId, sortOrder: index })),
      { transaction },
    );
  }
}
