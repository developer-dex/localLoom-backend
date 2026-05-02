import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ITradieWorkPhotoAttributes {
  id: string;
  tradieProfileId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ITradieWorkPhotoCreationAttributes = Optional<ITradieWorkPhotoAttributes, 'id' | 'sortOrder' | 'createdAt' | 'updatedAt'>;

export class TradieWorkPhoto extends Model<ITradieWorkPhotoAttributes, ITradieWorkPhotoCreationAttributes> implements ITradieWorkPhotoAttributes {
  declare id: string;
  declare tradieProfileId: string;
  declare imageUrl: string;
  declare sortOrder: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

TradieWorkPhoto.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tradieProfileId: { type: DataTypes.UUID, allowNull: false, field: 'tradie_profile_id' },
    imageUrl: { type: DataTypes.STRING(500), allowNull: false, field: 'image_url' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  { sequelize, tableName: 'tradie_work_photos', timestamps: true, underscored: true },
);
