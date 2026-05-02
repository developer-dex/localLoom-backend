import { Socket } from 'socket.io';
import { AuthPayload } from '../common/interfaces';

export interface AuthenticatedSocket extends Socket {
  user: AuthPayload;
}

export interface ServerToClientEvents {
  'chat:message': (data: MessagePayload) => void;
  'chat:typing': (data: TypingPayload) => void;
  'chat:stop-typing': (data: TypingPayload) => void;
  'chat:read': (data: ReadPayload) => void;
  'chat:online-status': (data: OnlineStatusPayload) => void;
  'notification:new': (data: NotificationPayload) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'chat:send-message': (data: SendMessagePayload, callback: (ack: AckPayload) => void) => void;
  'chat:typing': (data: TypingPayload) => void;
  'chat:stop-typing': (data: TypingPayload) => void;
  'chat:join': (data: { conversationId: string }) => void;
  'chat:leave': (data: { conversationId: string }) => void;
  'chat:mark-read': (data: { conversationId: string }) => void;
}

export interface MessagePayload {
  _id: string;
  conversationId: string;
  sender: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  type: string;
  attachments?: string[];
  createdAt: string;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  type?: string;
  attachments?: string[];
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  name: string;
}

export interface ReadPayload {
  conversationId: string;
  userId: string;
}

export interface OnlineStatusPayload {
  userId: string;
  isOnline: boolean;
}

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface AckPayload {
  success: boolean;
  messageId?: string;
  error?: string;
}
