import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IHelpDeskRequestAttributes {
  id: string;
  name: string;
  email: string;
  message: string;
  status: 'pending' | 'resolved';
  createdAt?: Date;
  updatedAt?: Date;
}

export type IHelpDeskRequestCreationAttributes = Optional<IHelpDeskRequestAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'>;

export class HelpDeskRequest extends Model<IHelpDeskRequestAttributes, IHelpDeskRequestCreationAttributes> implements IHelpDeskRequestAttributes {
  declare id: string;
  declare name: string;
  declare email: string;
  declare message: string;
  declare status: 'pending' | 'resolved';
  declare createdAt: Date;
  declare updatedAt: Date;
}

HelpDeskRequest.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
  },
  { sequelize, tableName: 'help_desk_requests', underscored: true },
);
