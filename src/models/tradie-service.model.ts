import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ITradieServiceAttributes {
  id: string;
  tradieProfileId: string;
  categoryId: string;
  createdAt: Date;
}

export type ITradieServiceCreationAttributes = Optional<ITradieServiceAttributes, 'id' | 'createdAt'>;

export class TradieService extends Model<ITradieServiceAttributes, ITradieServiceCreationAttributes> implements ITradieServiceAttributes {
  declare id: string;
  declare tradieProfileId: string;
  declare categoryId: string;
  declare createdAt: Date;
}

TradieService.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tradieProfileId: { type: DataTypes.UUID, allowNull: false, field: 'tradie_profile_id' },
    categoryId: { type: DataTypes.UUID, allowNull: false, field: 'category_id' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
  },
  { sequelize, tableName: 'tradie_services', timestamps: true, updatedAt: false, underscored: true },
);
