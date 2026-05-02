import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IReportAttributes {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description?: string | null;
  status: string;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type IReportCreationAttributes = Optional<IReportAttributes, 'id' | 'description' | 'status' | 'resolvedBy' | 'resolvedAt' | 'createdAt' | 'updatedAt'>;

export class Report extends Model<IReportAttributes, IReportCreationAttributes> implements IReportAttributes {
  declare id: string;
  declare reporterId: string;
  declare targetType: string;
  declare targetId: string;
  declare reason: string;
  declare description: string | null;
  declare status: string;
  declare resolvedBy: string | null;
  declare resolvedAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Report.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    reporterId: { type: DataTypes.UUID, allowNull: false, field: 'reporter_id' },
    targetType: { type: DataTypes.STRING(20), allowNull: false, field: 'target_type' },
    targetId: { type: DataTypes.UUID, allowNull: false, field: 'target_id' },
    reason: { type: DataTypes.STRING(500), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    resolvedBy: { type: DataTypes.UUID, allowNull: true, field: 'resolved_by' },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  { sequelize, tableName: 'reports', timestamps: true, underscored: true },
);
