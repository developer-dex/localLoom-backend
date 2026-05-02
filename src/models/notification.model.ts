import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface INotificationAttributes {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  sentAt: Date;
  readAt?: Date | null;
}

export type INotificationCreationAttributes = Optional<INotificationAttributes, 'id' | 'data' | 'isRead' | 'sentAt' | 'readAt'>;

export class Notification extends Model<INotificationAttributes, INotificationCreationAttributes> implements INotificationAttributes {
  declare id: string;
  declare userId: string;
  declare type: string;
  declare title: string;
  declare body: string;
  declare data: Record<string, unknown> | null;
  declare isRead: boolean;
  declare sentAt: Date;
  declare readAt: Date | null;
}

Notification.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    type: { type: DataTypes.STRING(50), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    data: { type: DataTypes.JSONB, allowNull: true },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_read' },
    sentAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'sent_at' },
    readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
  },
  { sequelize, tableName: 'notifications', timestamps: false, underscored: true },
);
