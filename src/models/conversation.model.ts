import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface IConversationAttributes {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  lastMessageId?: string | null;
  fromLastReadAt?: Date | null;
  toLastReadAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type IConversationCreationAttributes = Optional<
  IConversationAttributes,
  'id' | 'status' | 'lastMessageId' | 'fromLastReadAt' | 'toLastReadAt' | 'createdAt' | 'updatedAt'
>;

export class Conversation extends Model<IConversationAttributes, IConversationCreationAttributes> implements IConversationAttributes {
  declare id: string;
  declare fromUserId: string;
  declare toUserId: string;
  declare status: string;
  declare lastMessageId: string | null;
  declare fromLastReadAt: Date | null;
  declare toLastReadAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Association accessors
  declare fromUser?: import('./user.model').User;
  declare toUser?: import('./user.model').User;
  declare lastMessage?: import('./message.model').Message | null;
}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fromUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'from_user_id',
    },
    toUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'to_user_id',
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
    fromLastReadAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: 'from_last_read_at',
    },
    toLastReadAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: 'to_last_read_at',
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
