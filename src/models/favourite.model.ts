import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IFavouriteAttributes {
  id: string;
  customerId: string;
  tradieProfileId: string;
  createdAt: Date;
}

export type IFavouriteCreationAttributes = Optional<IFavouriteAttributes, 'id' | 'createdAt'>;

export class Favourite extends Model<IFavouriteAttributes, IFavouriteCreationAttributes> implements IFavouriteAttributes {
  declare id: string;
  declare customerId: string;
  declare tradieProfileId: string;
  declare createdAt: Date;
}

Favourite.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    customerId: { type: DataTypes.UUID, allowNull: false, field: 'customer_id' },
    tradieProfileId: { type: DataTypes.UUID, allowNull: false, field: 'tradie_profile_id' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
  },
  { sequelize, tableName: 'favourites', timestamps: true, updatedAt: false, underscored: true },
);
