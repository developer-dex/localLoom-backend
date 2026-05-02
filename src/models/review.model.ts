import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IReviewAttributes {
  id: string;
  customerId: string;
  tradieProfileId: string;
  rating: number;
  comment?: string | null;
  status: string;
  rejectionReason?: string | null;
  reviewedByAdmin?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type IReviewCreationAttributes = Optional<IReviewAttributes, 'id' | 'comment' | 'status' | 'rejectionReason' | 'reviewedByAdmin' | 'reviewedAt' | 'createdAt' | 'updatedAt'>;

export class Review extends Model<IReviewAttributes, IReviewCreationAttributes> implements IReviewAttributes {
  declare id: string;
  declare customerId: string;
  declare tradieProfileId: string;
  declare rating: number;
  declare comment: string | null;
  declare status: string;
  declare rejectionReason: string | null;
  declare reviewedByAdmin: string | null;
  declare reviewedAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  declare customer?: import('./user.model').User;
}

Review.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    customerId: { type: DataTypes.UUID, allowNull: false, field: 'customer_id' },
    tradieProfileId: { type: DataTypes.UUID, allowNull: false, field: 'tradie_profile_id' },
    rating: { type: DataTypes.SMALLINT, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true, field: 'rejection_reason' },
    reviewedByAdmin: { type: DataTypes.UUID, allowNull: true, field: 'reviewed_by_admin' },
    reviewedAt: { type: DataTypes.DATE, allowNull: true, field: 'reviewed_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  { sequelize, tableName: 'reviews', timestamps: true, underscored: true },
);
