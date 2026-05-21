import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type { Attachment_Descriptor } from '../modules/chat/chat.interface';

export interface IMessageAttributes {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  status: string;
  attachments?: Attachment_Descriptor[] | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IMessageCreationAttributes = Optional<IMessageAttributes, 'id' | 'type' | 'status' | 'attachments' | 'isDeleted' | 'createdAt' | 'updatedAt'>;

export class Message extends Model<IMessageAttributes, IMessageCreationAttributes> implements IMessageAttributes {
  declare id: string;
  declare conversationId: string;
  declare senderId: string;
  declare content: string;
  declare type: string;
  declare status: string;
  declare attachments: Attachment_Descriptor[] | null;
  declare isDeleted: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Association accessors
  declare sender?: import('./user.model').User;
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'conversation_id',
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'sender_id',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'text',
    },
    status: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'sent',
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_deleted',
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
    tableName: 'messages',
    timestamps: true,
    underscored: true,
  },
);
