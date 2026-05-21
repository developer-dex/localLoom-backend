import { Server } from 'socket.io';
import {
  AuthenticatedSocket,
  ServerToClientEvents,
  ClientToServerEvents,
  SendMessagePayload,
  SendMessageAck,
  MarkReadAck,
} from '../socket.types';
import { logger } from '../../common/utils/logger';
import { ChatService } from '../../modules/chat/chat.service';
import { ChatRepository } from '../../modules/chat/chat.repository';
import { ChatErrorCode, mapErrorToSocketAck } from '../../modules/chat/chat.errors';
import { ChatTypingThrottle } from '../../modules/chat/chat.realtime';
import { sendMessageSchema, markReadSchema } from '../../modules/chat/chat.validation';
import { User } from '../../models/user.model';

// ─── Shared instances ────────────────────────────────────────────────────────

const repo = new ChatRepository();
const service = new ChatService();

// ─── Payload size guard (64 KB) ──────────────────────────────────────────────

const MAX_PAYLOAD_BYTES = 64 * 1024;

function payloadTooLarge(data: unknown): boolean {
  try {
    return Buffer.byteLength(JSON.stringify(data), 'utf8') > MAX_PAYLOAD_BYTES;
  } catch {
    return true;
  }
}

// ─── UUID validation ─────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(val: unknown): val is string {
  return typeof val === 'string' && UUID_RE.test(val);
}

// ─── Handler registration ────────────────────────────────────────────────────

export const registerChatHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket,
): void => {
  const userId = socket.user.userId;

  // Per-socket typing throttle (capacity 5, refill 5/s)
  const typingThrottle = new ChatTypingThrottle(5, 5);

  // Resolve user name for typing events (non-blocking)
  let userName = '';
  (async () => {
    try {
      const user = await User.findByPk(userId, { attributes: ['name'] });
      if (user) userName = user.name ?? '';
    } catch {
      // Best-effort; typing events will use empty name
    }
  })();

  // ── Auto-subscribe: join user room + all participating conversations ──────

  socket.join(`user:${userId}`);

  // Non-blocking auto-subscribe to conversation rooms
  (async () => {
    try {
      const conversationIds = await repo.listParticipatingConversationIds(userId);
      for (const convId of conversationIds) {
        socket.join(`conversation:${convId}`);
      }
      logger.debug(`User ${userId} auto-subscribed to ${conversationIds.length} conversations`);
    } catch (err) {
      logger.error(`Auto-subscribe failed for user ${userId}:`, err);
      socket.emit('error', {
        message: 'Failed to auto-subscribe to conversations',
        code: ChatErrorCode.AutosubscribeFailed,
      });
    }
  })();

  // ── chat:join ─────────────────────────────────────────────────────────────

  socket.on('chat:join', async ({ conversationId }) => {
    if (!isValidUuid(conversationId)) {
      socket.emit('error', {
        message: 'Invalid conversation ID',
        code: ChatErrorCode.JoinForbidden,
      });
      return;
    }

    try {
      const allowed = await service.canSubscribe(userId, conversationId);
      if (!allowed) {
        socket.emit('error', {
          message: 'Not a participant of this conversation',
          code: ChatErrorCode.JoinForbidden,
        });
        return;
      }
      socket.join(`conversation:${conversationId}`);
      logger.debug(`User ${userId} joined conversation ${conversationId}`);
    } catch (err) {
      logger.error(`chat:join error for user ${userId}:`, err);
      socket.emit('error', {
        message: 'Failed to join conversation',
        code: ChatErrorCode.JoinForbidden,
      });
    }
  });

  // ── chat:leave ────────────────────────────────────────────────────────────

  socket.on('chat:leave', ({ conversationId }) => {
    if (!isValidUuid(conversationId)) {
      return;
    }
    socket.leave(`conversation:${conversationId}`);
    logger.debug(`User ${userId} left conversation ${conversationId}`);
  });

  // ── chat:send-message ─────────────────────────────────────────────────────

  socket.on('chat:send-message', async (data: SendMessagePayload, ack?: (resp: SendMessageAck) => void) => {
    // Payload size guard
    if (payloadTooLarge(data)) {
      if (ack) {
        ack({
          success: false,
          error: { code: ChatErrorCode.PayloadTooLarge, message: 'Payload exceeds 64KB limit' },
        });
      }
      return;
    }

    // Validate
    const { error: validationError, value } = sendMessageSchema.validate(data, { abortEarly: false });
    if (validationError) {
      if (ack) {
        ack({
          success: false,
          error: { code: ChatErrorCode.ValidationError, message: validationError.message },
        });
      }
      return;
    }

    try {
      const result = await service.sendMessage(userId, value);
      if (ack) {
        ack({
          success: true,
          message: result.message,
          clientMessageId: result.clientMessageId,
        });
      }
    } catch (err) {
      logger.error(`chat:send-message error for user ${userId}:`, err);
      if (ack) {
        ack(mapErrorToSocketAck(err));
      }
    }
  });

  // ── chat:typing ───────────────────────────────────────────────────────────

  socket.on('chat:typing', ({ conversationId }) => {
    if (!isValidUuid(conversationId)) return;
    if (!typingThrottle.consume()) return; // silently drop

    socket.to(`conversation:${conversationId}`).emit('chat:typing', {
      conversationId,
      userId,
      name: userName,
    });
  });

  // ── chat:stop-typing ──────────────────────────────────────────────────────

  socket.on('chat:stop-typing', ({ conversationId }) => {
    if (!isValidUuid(conversationId)) return;
    if (!typingThrottle.consume()) return; // silently drop

    socket.to(`conversation:${conversationId}`).emit('chat:stop-typing', {
      conversationId,
      userId,
      name: userName,
    });
  });

  // ── chat:mark-read ────────────────────────────────────────────────────────

  socket.on('chat:mark-read', async (data: { conversationId: string; lastReadMessageId?: string }, ack?: (resp: MarkReadAck) => void) => {
    // Payload size guard
    if (payloadTooLarge(data)) {
      if (ack) {
        ack({
          success: false,
          error: { code: ChatErrorCode.PayloadTooLarge, message: 'Payload exceeds 64KB limit' },
        });
      }
      return;
    }

    // Validate
    const { error: validationError, value } = markReadSchema.validate(
      { lastReadMessageId: data.lastReadMessageId },
      { abortEarly: false },
    );
    if (validationError) {
      if (ack) {
        ack({
          success: false,
          error: { code: ChatErrorCode.ValidationError, message: validationError.message },
        });
      }
      return;
    }

    if (!isValidUuid(data.conversationId)) {
      if (ack) {
        ack({
          success: false,
          error: { code: ChatErrorCode.ValidationError, message: 'Invalid conversation ID' },
        });
      }
      return;
    }

    try {
      const result = await service.markRead(userId, data.conversationId, value.lastReadMessageId);
      if (ack) {
        ack({
          success: true,
          conversationId: result.conversationId,
          lastReadAt: result.lastReadAt,
          unreadCount: result.unreadCount,
        });
      }
    } catch (err) {
      logger.error(`chat:mark-read error for user ${userId}:`, err);
      if (ack) {
        ack(mapErrorToSocketAck(err));
      }
    }
  });
};
