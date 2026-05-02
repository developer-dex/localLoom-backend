import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IDeviceTokenAttributes {
  id: string;
  userId: string;
  token: string;
  platform: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IDeviceTokenCreationAttributes = Optional<IDeviceTokenAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>;

export class DeviceToken extends Model<IDeviceTokenAttributes, IDeviceTokenCreationAttributes> implements IDeviceTokenAttributes {
  declare id: string;
  declare userId: string;
  declare token: string;
  declare platform: string;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

DeviceToken.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    token: { type: DataTypes.TEXT, allowNull: false, unique: true },
    platform: { type: DataTypes.STRING(10), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  { sequelize, tableName: 'device_tokens', timestamps: true, underscored: true },
);
