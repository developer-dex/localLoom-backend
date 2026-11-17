import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';
export type InvoiceIssueDateMode = 'date_sent' | 'custom';
export type InvoiceDiscountType = 'amount' | 'percent';
export type InvoicePaymentTerms =
  | 'due_on_receipt'
  | 'net_7'
  | 'net_15'
  | 'net_30'
  | 'net_45'
  | 'net_60'
  | 'end_of_month'
  | 'end_of_next_month';

/**
 * Money columns are DECIMAL; the pg driver returns them as strings, so they are
 * typed `string | number` here and converted with Number() when serialised.
 */
export interface IInvoiceAttributes {
  id: string;
  tradieProfileId: string;
  sequenceNumber: number;
  clientUserId: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  clientAddress: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  title: string;
  issueDateMode: InvoiceIssueDateMode;
  issuedDate: string | null;
  paymentTerms: InvoicePaymentTerms;
  dueDate: string | null;
  discountType: InvoiceDiscountType;
  discountValue: string | number;
  taxRate: string | number;
  subtotal: string | number;
  discountAmount: string | number;
  taxAmount: string | number;
  total: string | number;
  currency: string;
  clientMessage: string | null;
  disclaimer: string | null;
  status: InvoiceStatus;
  sentAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type IInvoiceCreationAttributes = Optional<
  IInvoiceAttributes,
  | 'id' | 'clientUserId' | 'clientFirstName' | 'clientLastName' | 'clientAddress' | 'clientPhone'
  | 'clientEmail' | 'title' | 'issueDateMode' | 'issuedDate' | 'paymentTerms' | 'dueDate'
  | 'discountType' | 'discountValue' | 'taxRate' | 'subtotal' | 'discountAmount' | 'taxAmount'
  | 'total' | 'currency' | 'clientMessage' | 'disclaimer' | 'status' | 'sentAt' | 'paidAt'
  | 'createdAt' | 'updatedAt'
>;

export class Invoice extends Model<IInvoiceAttributes, IInvoiceCreationAttributes> implements IInvoiceAttributes {
  declare id: string;
  declare tradieProfileId: string;
  declare sequenceNumber: number;
  declare clientUserId: string | null;
  declare clientFirstName: string | null;
  declare clientLastName: string | null;
  declare clientAddress: string | null;
  declare clientPhone: string | null;
  declare clientEmail: string | null;
  declare title: string;
  declare issueDateMode: InvoiceIssueDateMode;
  declare issuedDate: string | null;
  declare paymentTerms: InvoicePaymentTerms;
  declare dueDate: string | null;
  declare discountType: InvoiceDiscountType;
  declare discountValue: string | number;
  declare taxRate: string | number;
  declare subtotal: string | number;
  declare discountAmount: string | number;
  declare taxAmount: string | number;
  declare total: string | number;
  declare currency: string;
  declare clientMessage: string | null;
  declare disclaimer: string | null;
  declare status: InvoiceStatus;
  declare sentAt: Date | null;
  declare paidAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Associations
  declare lineItems?: import('./invoice-line-item.model').InvoiceLineItem[];
  declare tradieProfile?: import('./tradie-profile.model').TradieProfile;
}

Invoice.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tradieProfileId: { type: DataTypes.UUID, allowNull: false, field: 'tradie_profile_id' },
    sequenceNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'sequence_number' },
    clientUserId: { type: DataTypes.UUID, allowNull: true, field: 'client_user_id' },
    clientFirstName: { type: DataTypes.STRING(100), allowNull: true, field: 'client_first_name' },
    clientLastName: { type: DataTypes.STRING(100), allowNull: true, field: 'client_last_name' },
    clientAddress: { type: DataTypes.STRING(500), allowNull: true, field: 'client_address' },
    clientPhone: { type: DataTypes.STRING(20), allowNull: true, field: 'client_phone' },
    clientEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'client_email' },
    title: { type: DataTypes.STRING(200), allowNull: false, defaultValue: 'For Services Rendered' },
    issueDateMode: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'date_sent', field: 'issue_date_mode' },
    issuedDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'issued_date' },
    paymentTerms: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'due_on_receipt', field: 'payment_terms' },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'due_date' },
    discountType: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'amount', field: 'discount_type' },
    discountValue: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'discount_value' },
    taxRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0, field: 'tax_rate' },
    subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    discountAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'discount_amount' },
    taxAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'tax_amount' },
    total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'AUD' },
    clientMessage: { type: DataTypes.TEXT, allowNull: true, field: 'client_message' },
    disclaimer: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    sentAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_at' },
    paidAt: { type: DataTypes.DATE, allowNull: true, field: 'paid_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  { sequelize, tableName: 'invoices', timestamps: true, underscored: true },
);
