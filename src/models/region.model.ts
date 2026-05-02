import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IRegionAttributes {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IRegionCreationAttributes = Optional<IRegionAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>;

export class Region extends Model<IRegionAttributes, IRegionCreationAttributes> implements IRegionAttributes {
  declare id: string;
  declare name: string;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Region.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  { sequelize, tableName: 'regions', timestamps: true, underscored: true },
);
