import { Server } from 'socket.io';
import { Application } from 'express';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  ChatMessageEmitPayload,
  ReadPayload,
  ConversationUpdatedPayload,
} from '../../socket/socket.types';
import type { ConversationListItem, MessagePayload } from './chat.interface';
import { logger } from '../../common/utils/logger';

// ─── Typing throttle (token-bucket, per-socket) ─────────────────────────────

/**
 * A simple sliding-window token bucket used to throttle typing events per socket.
 * Capacity tokens are available; tokens refill at `refillRate` per second.
 */
export class ChatTypingThrottle {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number = 5,
    private readonly refillRate: number = 5,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Attempt to consume one token. Returns `true` if allowed, `false` if throttled.
   */
  consume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const refilled = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + refilled);
    this.lastRefill = now;
  }
}

// ─── Module-scope io reference (populated lazily) ────────────────────────────

let chatIoRef: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

// ─── Startup hook ────────────────────────────────────────────────────────────

/**
 * Pulls the Socket.IO server instance from `app.get('io')` into the module-scope
 * reference. Must be called after `app.set('io', io)` during server bootstrap.
 */
export function bindChatRealtime(app: Application): void {
  chatIoRef = app.get('io') as Server<ClientToServerEvents, ServerToClientEvents>;
  logger.info('ChatRealtime: io reference bound');
}

/**
 * Test seam — allows injecting a mock io instance in unit/integration tests.
 */
export function setRealtimeIoForTest(io: Server<ClientToServerEvents, ServerToClientEvents> | null): void {
  chatIoRef = io;
}

// ─── Broadcast interfaces ────────────────────────────────────────────────────

export interface BroadcastMessageInput {
  message: MessagePayload;
  fromUserId: string;
  toUserId: string;
  senderId: string;
  fromUserListItem: ConversationListItem;
  toUserListItem: ConversationListItem;
}

export interface BroadcastReadInput {
  conversationId: string;
  userId: string;
  lastReadMessageId: string | null;
  lastReadAt: string;
  fromUserId: string;
  toUserId: string;
}

export interface BroadcastConversationCreatedInput {
  fromUserId: string;
  toUserId: string;
  fromUserListItem: ConversationListItem;
  toUserListItem: ConversationListItem;
}

// ─── ChatRealtime class ──────────────────────────────────────────────────────

export class ChatRealtime {
  private get io(): Server<ClientToServerEvents, ServerToClientEvents> {
    if (!chatIoRef) {
      throw new Error('ChatRealtime: io not bound. Call bindChatRealtime(app) during startup.');
    }
    return chatIoRef;
  }

  /**
   * Broadcasts a new message to both participants' user rooms.
   * Each participant also receives a `chat:conversation-updated` event with their
   * perspective list-item so sidebar UIs can refresh without a round-trip.
   */
  broadcastMessage(input: BroadcastMessageInput): void {
    const { message, fromUserId, toUserId, senderId, fromUserListItem, toUserListItem } = input;

    const messagePayload: ChatMessageEmitPayload = { ...message };

    // Emit the message to both participant rooms
    this.io.to(`user:${fromUserId}`).emit('chat:message', messagePayload);
    this.io.to(`user:${toUserId}`).emit('chat:message', messagePayload);

    // Emit conversation-updated with each participant's perspective
    const fromConvPayload: ConversationUpdatedPayload = { conversation: fromUserListItem };
    const toConvPayload: ConversationUpdatedPayload = { conversation: toUserListItem };

    this.io.to(`user:${fromUserId}`).emit('chat:conversation-updated', fromConvPayload);
    this.io.to(`user:${toUserId}`).emit('chat:conversation-updated', toConvPayload);
  }

  /**
   * Broadcasts a read-receipt to both participants' user rooms.
   */
  broadcastRead(input: BroadcastReadInput): void {
    const { conversationId, userId, lastReadMessageId, lastReadAt, fromUserId, toUserId } = input;

    const readPayload: ReadPayload = {
      conversationId,
      userId,
      lastReadMessageId,
      lastReadAt,
    };

    this.io.to(`user:${fromUserId}`).emit('chat:read', readPayload);
    this.io.to(`user:${toUserId}`).emit('chat:read', readPayload);
  }

  /**
   * Broadcasts a newly created conversation to both participants so their
   * conversation lists update in real time.
   */
  broadcastConversationCreated(input: BroadcastConversationCreatedInput): void {
    const { fromUserId, toUserId, fromUserListItem, toUserListItem } = input;

    const fromPayload: ConversationUpdatedPayload = { conversation: fromUserListItem };
    const toPayload: ConversationUpdatedPayload = { conversation: toUserListItem };

    this.io.to(`user:${fromUserId}`).emit('chat:conversation-updated', fromPayload);
    this.io.to(`user:${toUserId}`).emit('chat:conversation-updated', toPayload);
  }
}
