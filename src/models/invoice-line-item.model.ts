import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IInvoiceLineItemAttributes {
  id: string;
  invoiceId: string;
  name: string;
  description: string | null;
  quantity: string | number;
  unitPrice: string | number;
  total: string | number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IInvoiceLineItemCreationAttributes = Optional<
  IInvoiceLineItemAttributes,
  'id' | 'description' | 'quantity' | 'unitPrice' | 'total' | 'sortOrder' | 'createdAt' | 'updatedAt'
>;

export class InvoiceLineItem
  extends Model<IInvoiceLineItemAttributes, IInvoiceLineItemCreationAttributes>
  implements IInvoiceLineItemAttributes
{
  declare id: string;
  declare invoiceId: string;
  declare name: string;
  declare description: string | null;
  declare quantity: string | number;
  declare unitPrice: string | number;
  declare total: string | number;
  declare sortOrder: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

InvoiceLineItem.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    invoiceId: { type: DataTypes.UUID, allowNull: false, field: 'invoice_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
    unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'unit_price' },
    total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  { sequelize, tableName: 'invoice_line_items', timestamps: true, underscored: true },
);
