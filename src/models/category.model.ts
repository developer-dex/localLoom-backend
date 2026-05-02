import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ICategoryAttributes {
  id: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ICategoryCreationAttributes = Optional<ICategoryAttributes, 'id' | 'icon' | 'description' | 'isActive' | 'sortOrder' | 'createdAt' | 'updatedAt'>;

export class Category extends Model<ICategoryAttributes, ICategoryCreationAttributes> implements ICategoryAttributes {
  declare id: string;
  declare name: string;
  declare icon: string | null;
  declare description: string | null;
  declare isActive: boolean;
  declare sortOrder: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Category.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    icon: { type: DataTypes.STRING(500), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  { sequelize, tableName: 'categories', timestamps: true, underscored: true },
);
