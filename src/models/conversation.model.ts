import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IConversationAttributes {
  id: string;
  customerId: string;
  tradieId: string;
  status: string;
  lastMessageId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type IConversationCreationAttributes = Optional<IConversationAttributes, 'id' | 'status' | 'lastMessageId' | 'createdAt' | 'updatedAt'>;

export class Conversation extends Model<IConversationAttributes, IConversationCreationAttributes> implements IConversationAttributes {
  declare id: string;
  declare customerId: string;
  declare tradieId: string;
  declare status: string;
  declare lastMessageId: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Association accessors
  declare customer?: import('./user.model').User;
  declare tradie?: import('./user.model').User;
  declare lastMessage?: import('./message.model').Message | null;
}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'customer_id',
    },
    tradieId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'tradie_id',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
    },
    lastMessageId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'last_message_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'conversations',
    timestamps: true,
    underscored: true,
  },
);
