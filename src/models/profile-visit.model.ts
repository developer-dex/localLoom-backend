import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IProfileVisitAttributes {
  id: string;
  tradieProfileId: string;
  visitorId?: string | null;
  ipAddress?: string | null;
  isSimulated: boolean;
  visitedAt: Date;
}

export type IProfileVisitCreationAttributes = Optional<IProfileVisitAttributes, 'id' | 'visitorId' | 'ipAddress' | 'isSimulated' | 'visitedAt'>;

export class ProfileVisit extends Model<IProfileVisitAttributes, IProfileVisitCreationAttributes> implements IProfileVisitAttributes {
  declare id: string;
  declare tradieProfileId: string;
  declare visitorId: string | null;
  declare ipAddress: string | null;
  declare isSimulated: boolean;
  declare visitedAt: Date;
}

ProfileVisit.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tradieProfileId: { type: DataTypes.UUID, allowNull: false, field: 'tradie_profile_id' },
    visitorId: { type: DataTypes.UUID, allowNull: true, field: 'visitor_id' },
    ipAddress: { type: DataTypes.STRING(45), allowNull: true, field: 'ip_address' },
    isSimulated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_simulated' },
    visitedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'visited_at' },
  },
  { sequelize, tableName: 'profile_visits', timestamps: false, underscored: true },
);
