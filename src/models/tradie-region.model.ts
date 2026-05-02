import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ITradieRegionAttributes {
  id: string;
  tradieProfileId: string;
  regionId: string;
  createdAt: Date;
}

export type ITradieRegionCreationAttributes = Optional<ITradieRegionAttributes, 'id' | 'createdAt'>;

export class TradieRegion extends Model<ITradieRegionAttributes, ITradieRegionCreationAttributes> implements ITradieRegionAttributes {
  declare id: string;
  declare tradieProfileId: string;
  declare regionId: string;
  declare createdAt: Date;
}

TradieRegion.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tradieProfileId: { type: DataTypes.UUID, allowNull: false, field: 'tradie_profile_id' },
    regionId: { type: DataTypes.UUID, allowNull: false, field: 'region_id' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
  },
  { sequelize, tableName: 'tradie_regions', timestamps: true, updatedAt: false, underscored: true },
);
