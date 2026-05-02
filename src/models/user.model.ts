import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcrypt';
import { sequelize } from '../config/database';

export interface IUserAttributes {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  password?: string | null;
  avatar?: string | null;
  role: string;
  status: string;
  isPhoneVerified: boolean;
  overallRating: number;
  lastLogin?: Date | null;
  refreshToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type IUserCreationAttributes = Optional<IUserAttributes, 'id' | 'name' | 'email' | 'password' | 'avatar' | 'role' | 'status' | 'isPhoneVerified' | 'overallRating' | 'lastLogin' | 'refreshToken' | 'createdAt' | 'updatedAt'>;

export class User extends Model<IUserAttributes, IUserCreationAttributes> implements IUserAttributes {
  declare id: string;
  declare name: string;
  declare email: string | null;
  declare phone: string;
  declare password: string | null;
  declare avatar: string | null;
  declare role: string;
  declare status: string;
  declare isPhoneVerified: boolean;
  declare overallRating: number;
  declare lastLogin: Date | null;
  declare refreshToken: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  async comparePassword(candidatePassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
  }

  toSafeJSON(): Omit<IUserAttributes, 'password' | 'refreshToken'> {
    const json = this.toJSON();
    const { password: _p, refreshToken: _r, ...safe } = json;
    return safe;
  }
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
    email: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    phone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: true },
    avatar: { type: DataTypes.STRING(500), allowNull: true },
    role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'customer' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    isPhoneVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_phone_verified' },
    overallRating: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0.0, field: 'overall_rating' },
    lastLogin: { type: DataTypes.DATE, allowNull: true, field: 'last_login' },
    refreshToken: { type: DataTypes.TEXT, allowNull: true, field: 'refresh_token' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
    defaultScope: { attributes: { exclude: ['password', 'refreshToken'] } },
    scopes: {
      withPassword: { attributes: { include: ['password'] } },
      withRefreshToken: { attributes: { include: ['password', 'refreshToken'] } },
    },
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password') && user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  },
);
