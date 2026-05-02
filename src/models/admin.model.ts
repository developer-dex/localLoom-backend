import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcrypt';
import { sequelize } from '../config/database';

export interface IAdminAttributes {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar?: string | null;
  role: string;
  status: string;
  lastLogin?: Date | null;
  refreshToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type IAdminCreationAttributes = Optional<IAdminAttributes, 'id' | 'avatar' | 'role' | 'status' | 'lastLogin' | 'refreshToken' | 'createdAt' | 'updatedAt'>;

export class Admin extends Model<IAdminAttributes, IAdminCreationAttributes> implements IAdminAttributes {
  declare id: string;
  declare name: string;
  declare email: string;
  declare password: string;
  declare avatar: string | null;
  declare role: string;
  declare status: string;
  declare lastLogin: Date | null;
  declare refreshToken: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

Admin.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    avatar: { type: DataTypes.STRING(500), allowNull: true },
    role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'admin' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    lastLogin: { type: DataTypes.DATE, allowNull: true, field: 'last_login' },
    refreshToken: { type: DataTypes.TEXT, allowNull: true, field: 'refresh_token' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'admins',
    timestamps: true,
    underscored: true,
    defaultScope: { attributes: { exclude: ['password', 'refreshToken'] } },
    scopes: {
      withPassword: { attributes: { include: ['password'] } },
      withRefreshToken: { attributes: { include: ['password', 'refreshToken'] } },
    },
    hooks: {
      beforeCreate: async (admin) => {
        if (admin.password) {
          const salt = await bcrypt.genSalt(12);
          admin.password = await bcrypt.hash(admin.password, salt);
        }
      },
      beforeUpdate: async (admin) => {
        if (admin.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          admin.password = await bcrypt.hash(admin.password, salt);
        }
      },
    },
  },
);
