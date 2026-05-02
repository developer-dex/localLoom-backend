import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IContactLogAttributes {
  id: string;
  customerId: string;
  tradieProfileId: string;
  contactedAt: Date;
  reviewEligibleAt: Date;
  reminder24hSent: boolean;
  reminder48hSent: boolean;
  reminder72hSent: boolean;
}

export type IContactLogCreationAttributes = Optional<IContactLogAttributes, 'id' | 'contactedAt' | 'reminder24hSent' | 'reminder48hSent' | 'reminder72hSent'>;

export class ContactLog extends Model<IContactLogAttributes, IContactLogCreationAttributes> implements IContactLogAttributes {
  declare id: string;
  declare customerId: string;
  declare tradieProfileId: string;
  declare contactedAt: Date;
  declare reviewEligibleAt: Date;
  declare reminder24hSent: boolean;
  declare reminder48hSent: boolean;
  declare reminder72hSent: boolean;
}

ContactLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    customerId: { type: DataTypes.UUID, allowNull: false, field: 'customer_id' },
    tradieProfileId: { type: DataTypes.UUID, allowNull: false, field: 'tradie_profile_id' },
    contactedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'contacted_at' },
    reviewEligibleAt: { type: DataTypes.DATE, allowNull: false, field: 'review_eligible_at' },
    reminder24hSent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'reminder_24h_sent' },
    reminder48hSent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'reminder_48h_sent' },
    reminder72hSent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'reminder_72h_sent' },
  },
  { sequelize, tableName: 'contact_logs', timestamps: false, underscored: true },
);
