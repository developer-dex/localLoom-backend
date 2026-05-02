import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IOtpCodeAttributes {
  id: string;
  phone: string | null;
  email: string | null;
  code: string;
  purpose: string;
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export type IOtpCodeCreationAttributes = Optional<IOtpCodeAttributes, 'id' | 'phone' | 'email' | 'purpose' | 'attempts' | 'maxAttempts' | 'isUsed' | 'createdAt'>;

export class OtpCode extends Model<IOtpCodeAttributes, IOtpCodeCreationAttributes> implements IOtpCodeAttributes {
  declare id: string;
  declare phone: string | null;
  declare email: string | null;
  declare code: string;
  declare purpose: string;
  declare attempts: number;
  declare maxAttempts: number;
  declare isUsed: boolean;
  declare expiresAt: Date;
  declare createdAt: Date;
}

OtpCode.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    code: { type: DataTypes.STRING(6), allowNull: false },
    purpose: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'login' },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    maxAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3, field: 'max_attempts' },
    isUsed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_used' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'otp_codes',
    timestamps: true,
    updatedAt: false,
    underscored: true,
  },
);
