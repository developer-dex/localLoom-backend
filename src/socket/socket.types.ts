import { Socket } from 'socket.io';
import { AuthPayload } from '../common/interfaces';
import type { Attachment_Descriptor, MessagePayload, ConversationListItem } from '../modules/chat/chat.interface';

export type { MessagePayload } from '../modules/chat/chat.interface';

export interface AuthenticatedSocket extends Socket {
  user: AuthPayload;
}

// ─── Shared payload types ────────────────────────────────────────────────────

export interface SendMessagePayload {
  conversationId?: string;
  recipientId?: string;
  content?: string;
  type?: 'text' | 'image' | 'video' | 'mixed';
  attachments?: Attachment_Descriptor[];
  clientMessageId?: string;
}

export interface ChatMessageEmitPayload extends MessagePayload {
  // MessagePayload already includes conversationId and optional clientMessageId.
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  name: string;
}

export interface ReadPayload {
  conversationId: string;
  userId: string;
  lastReadMessageId: string | null;
  lastReadAt: string;
}

export interface OnlineStatusPayload {
  userId: string;
  isOnline: boolean;
}

export interface ConversationUpdatedPayload {
  /** From the receiving user's perspective. */
  conversation: ConversationListItem;
}

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface ChatErrorPayload {
  message: string;
  code?: string;
}

// ─── Ack contracts ───────────────────────────────────────────────────────────

export interface SendMessageAckSuccess {
  success: true;
  message: ChatMessageEmitPayload;
  clientMessageId?: string;
}

export interface SendMessageAckFailure {
  success: false;
  error: { code: string; message: string };
}

export type SendMessageAck = SendMessageAckSuccess | SendMessageAckFailure;

export interface MarkReadAckSuccess {
  success: true;
  conversationId: string;
  lastReadAt: string;
  unreadCount: number;
}

export interface MarkReadAckFailure {
  success: false;
  error: { code: string; message: string };
}

export type MarkReadAck = MarkReadAckSuccess | MarkReadAckFailure;

// ─── Event maps ──────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  'chat:message': (data: ChatMessageEmitPayload) => void;
  'chat:typing': (data: TypingPayload) => void;
  'chat:stop-typing': (data: TypingPayload) => void;
  'chat:read': (data: ReadPayload) => void;
  'chat:online-status': (data: OnlineStatusPayload) => void;
  'chat:conversation-updated': (data: ConversationUpdatedPayload) => void;
  'notification:new': (data: NotificationPayload) => void;
  error: (data: ChatErrorPayload) => void;
}

export interface ClientToServerEvents {
  'chat:send-message': (data: SendMessagePayload, ack?: (resp: SendMessageAck) => void) => void;
  'chat:typing': (data: { conversationId: string }) => void;
  'chat:stop-typing': (data: { conversationId: string }) => void;
  'chat:join': (data: { conversationId: string }) => void;
  'chat:leave': (data: { conversationId: string }) => void;
  'chat:mark-read': (data: { conversationId: string; lastReadMessageId?: string }, ack?: (resp: MarkReadAck) => void) => void;
}
