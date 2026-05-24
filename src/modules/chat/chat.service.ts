/**
 * ChatService — canonical write path for the chat module.
 *
 * Architecture notes:
 * (a) NULL `from_last_read_at` / `to_last_read_at` is treated as epoch ('1970-01-01')
 *     for unread-count computation. This means pre-existing conversations created before
 *     the read-state migration will show all messages as unread until the user explicitly
 *     marks-read. This is the intended backfill semantic.
 * (b) The canonical from/to ordering convention (`from_user_id < to_user_id`) is a
 *     storage-only invariant. There is no read or write semantic distinction between the
 *     two columns — both participants have identical capabilities.
 * (c) Banned/suspended-user enforcement is a follow-up hook. This iteration permits any
 *     user whose `users.status <> 'deleted'`.
 */

import { User } from '../../models/user.model';
import { Op } from 'sequelize';
import { ChatRepository, ConversationRowProjection, MessageRow } from './chat.repository';
import { ChatRealtime } from './chat.realtime';
import { ChatSlidingWindowBucket, sharedSendBucket } from './chat.rate-limit';
import {
  ChatForbiddenException,
  ChatNotFoundException,
  ChatRateLimitedException,
  ChatValidationException,
} from './chat.errors';
import type {
  Attachment_Descriptor,
  AttachmentKind,
  ConversationListItem,
  MessageListMeta,
  MessagePayload,
  SendMessageDto,
} from './chat.interface';

// ─── Service class ───────────────────────────────────────────────────────────

export class ChatService {
  constructor(
    private readonly repo: ChatRepository = new ChatRepository(),
    private readonly realtime: ChatRealtime = new ChatRealtime(),
    private readonly sendBucket: ChatSlidingWindowBucket = sharedSendBucket,
  ) {}

  // ── Internal helpers ─────────────────────────────────────────────────────

  private assertParticipant(userId: string, conv: { fromUserId: string; toUserId: string }): void {
    if (userId !== conv.fromUserId && userId !== conv.toUserId) {
      throw new ChatForbiddenException('Not a participant of this conversation');
    }
  }

  private validateAttachments(arr: Attachment_Descriptor[]): void {
    if (arr.length > 5) {
      throw new ChatValidationException('A message may have at most 5 attachments');
    }
    for (const a of arr) {
      if (a.type !== 'image' && a.type !== 'video') {
        throw new ChatValidationException('Attachment type must be "image" or "video"');
      }
      if (!a.url || !a.url.startsWith('/public/chat-attachments/')) {
        throw new ChatValidationException('Attachment url must reference /public/chat-attachments/');
      }
      if (typeof a.size !== 'number' || a.size < 0) {
        throw new ChatValidationException('Attachment size must be a non-negative integer');
      }
      if (typeof a.mime !== 'string' || a.mime.length === 0) {
        throw new ChatValidationException('Attachment mime is required');
      }
    }
  }

  private resolveMessageType(
    suppliedType: 'text' | 'image' | 'video' | 'mixed' | undefined,
    attachments: Attachment_Descriptor[] | undefined,
  ): 'text' | 'image' | 'video' | 'mixed' {
    const atts = attachments ?? [];
    if (atts.length === 0) {
      return 'text';
    }

    const hasImage = atts.some((a) => a.type === 'image');
    const hasVideo = atts.some((a) => a.type === 'video');

    let derived: 'image' | 'video' | 'mixed';
    if (hasImage && hasVideo) {
      derived = 'mixed';
    } else if (hasVideo) {
      derived = 'video';
    } else {
      derived = 'image';
    }

    // If the caller supplied a media type, it must agree with what we derived
    if (suppliedType && suppliedType !== 'text' && suppliedType !== derived) {
      throw new ChatValidationException(
        `Supplied type "${suppliedType}" is inconsistent with attachment set (resolved: "${derived}")`,
      );
    }

    return derived;
  }

  // ── Public methods ───────────────────────────────────────────────────────

  async listConversations(
    userId: string,
    opts: { page: number; limit: number; search?: string },
  ): Promise<{ items: ConversationListItem[]; total: number; page: number; limit: number }> {
    const { rows, total } = await this.repo.listConversationsForUser(userId, opts);
    const items = rows.map((row) => this.repo.toConversationListItem(row, userId));
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async getConversation(userId: string, conversationId: string): Promise<ConversationListItem> {
    const conv = await this.repo.findConversationByIdRaw(conversationId);
    if (!conv) {
      throw new ChatNotFoundException('Conversation not found');
    }
    this.assertParticipant(userId, conv);
    return this.repo.toConversationListItem(conv, userId);
  }

  async getOrCreateConversation(
    userId: string,
    otherUserId: string,
  ): Promise<{ conversation: ConversationListItem; created: boolean }> {
    // Self-check
    if (otherUserId === userId) {
      throw new ChatValidationException('Cannot create a conversation with yourself');
    }

    // Dual-user fetch
    const users = await User.findAll({
      where: { id: { [Op.in]: [userId, otherUserId] } },
      attributes: ['id', 'status'],
    });

    const currentUser = users.find((u) => u.id === userId);
    const otherUser = users.find((u) => u.id === otherUserId);

    if (!currentUser || currentUser.status === 'deleted') {
      throw new ChatNotFoundException('User not found');
    }
    if (!otherUser || otherUser.status === 'deleted') {
      throw new ChatNotFoundException('Other user not found or has been deleted');
    }

    // Canonical ordering
    const lo = userId < otherUserId ? userId : otherUserId;
    const hi = userId < otherUserId ? otherUserId : userId;

    // Try to find existing
    const existing = await this.repo.findConversationByPair(lo, hi);
    if (existing) {
      return { conversation: this.repo.toConversationListItem(existing, userId), created: false };
    }

    // Optimistic create
    try {
      const conv = await this.repo.createConversation({ fromUserId: lo, toUserId: hi });

      // Re-read with full projection for the list item
      const fullConv = await this.repo.findConversationByIdRaw(conv.id);
      if (!fullConv) {
        // Shouldn't happen, but handle gracefully
        const listItem: ConversationListItem = {
          id: conv.id,
          otherParticipant: { id: otherUserId, name: '', avatar: null, role: '' },
          lastMessage: null,
          lastMessageAt: new Date(conv.createdAt).toISOString(),
          unreadCount: 0,
          createdAt: new Date(conv.createdAt).toISOString(),
          updatedAt: new Date(conv.updatedAt).toISOString(),
        };
        return { conversation: listItem, created: true };
      }

      const fromUserListItem = this.repo.toConversationListItem(fullConv, lo);
      const toUserListItem = this.repo.toConversationListItem(fullConv, hi);

      this.realtime.broadcastConversationCreated({
        fromUserId: lo,
        toUserId: hi,
        fromUserListItem,
        toUserListItem,
      });

      return { conversation: this.repo.toConversationListItem(fullConv, userId), created: true };
    } catch (err) {
      if (this.repo.isUniqueViolation(err, 'unique_from_to_conversation')) {
        const retried = await this.repo.findConversationByPair(lo, hi);
        if (retried) {
          return { conversation: this.repo.toConversationListItem(retried, userId), created: false };
        }
      }
      throw err;
    }
  }

  async listMessages(
    userId: string,
    conversationId: string,
    opts: { limit: number; before?: string },
  ): Promise<{ items: MessagePayload[]; meta: MessageListMeta }> {
    const conv = await this.repo.findConversationByIdRaw(conversationId);
    if (!conv) {
      throw new ChatNotFoundException('Conversation not found');
    }
    this.assertParticipant(userId, conv);

    // Hydrate cursor if before is supplied
    let cursor: { createdAt: Date; id: string } | null = null;
    if (opts.before) {
      const hydrated = await this.repo.hydrateCursor(conversationId, opts.before);
      if (!hydrated) {
        throw new ChatValidationException('Cursor message not found in this conversation');
      }
      cursor = hydrated;
    }

    const { items: rows, hasMore } = await this.repo.listMessagesByCursor(conversationId, {
      limit: opts.limit,
      cursor,
    });

    const items = rows.map((row) => this.repo.toMessagePayload(row));
    const count = items.length;
    const nextBefore = hasMore && rows.length > 0 ? rows[rows.length - 1].id : null;

    return {
      items,
      meta: { limit: opts.limit, count, hasMore, nextBefore },
    };
  }

  async sendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<{ message: MessagePayload; conversationId: string; clientMessageId?: string }> {
    // 1. Rate limit
    // if (!this.sendBucket.consume(userId)) { // TODO: re-enable rate limiting before production
    //   throw new ChatRateLimitedException('Too many chat requests');
    // }

    // 2. Resolve conversation
    let conv: ConversationRowProjection;

    if (dto.conversationId && dto.recipientId) {
      // Both supplied — load conversation and verify recipient matches
      const loaded = await this.repo.findConversationByIdRaw(dto.conversationId);
      if (!loaded) {
        throw new ChatNotFoundException('Conversation not found');
      }
      this.assertParticipant(userId, loaded);
      const otherId = loaded.fromUserId === userId ? loaded.toUserId : loaded.fromUserId;
      if (otherId !== dto.recipientId) {
        throw new ChatValidationException('recipientId does not match the conversation participant');
      }
      conv = loaded;
    } else if (dto.conversationId) {
      // Only conversationId
      const loaded = await this.repo.findConversationByIdRaw(dto.conversationId);
      if (!loaded) {
        throw new ChatNotFoundException('Conversation not found');
      }
      this.assertParticipant(userId, loaded);
      conv = loaded;
    } else if (dto.recipientId) {
      // Only recipientId — get or create
      const { conversation } = await this.getOrCreateConversation(userId, dto.recipientId);
      // Re-read the raw projection for the transaction
      const lo = userId < dto.recipientId ? userId : dto.recipientId;
      const hi = userId < dto.recipientId ? dto.recipientId : userId;
      const loaded = await this.repo.findConversationByPair(lo, hi);
      if (!loaded) {
        throw new ChatNotFoundException('Conversation not found after creation');
      }
      conv = loaded;
    } else {
      throw new ChatValidationException('Either conversationId or recipientId is required');
    }

    // 3. Authorize sender
    this.assertParticipant(userId, conv);

    // 4. Validate attachments
    const attachments = dto.attachments ?? [];
    this.validateAttachments(attachments);

    // 5. Resolve type
    const resolvedType = this.resolveMessageType(dto.type, dto.attachments);

    // 6. Persist atomically
    const { message, conversation: updatedConv } = await this.repo.insertMessageInTransaction({
      conversationId: conv.id,
      senderId: userId,
      content: (dto.content ?? '').trim(),
      type: resolvedType,
      attachments: attachments.length > 0 ? attachments : null,
    });

    // 7. Build payload
    const messageRow: MessageRow = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      type: message.type,
      status: message.status,
      attachments: message.attachments,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      senderName: conv.fromUserId === userId ? conv.fromUserName : conv.toUserName,
      senderAvatar: conv.fromUserId === userId ? conv.fromUserAvatar : conv.toUserAvatar,
    };
    const payload = this.repo.toMessagePayload(messageRow, dto.clientMessageId);

    // 8. Real-time fan-out
    const fromUserListItem = this.repo.toConversationListItem(updatedConv, updatedConv.fromUserId);
    const toUserListItem = this.repo.toConversationListItem(updatedConv, updatedConv.toUserId);

    this.realtime.broadcastMessage({
      message: payload,
      fromUserId: updatedConv.fromUserId,
      toUserId: updatedConv.toUserId,
      senderId: userId,
      fromUserListItem,
      toUserListItem,
    });

    // 9. Return
    return {
      message: payload,
      conversationId: conv.id,
      clientMessageId: dto.clientMessageId,
    };
  }

  async markRead(
    userId: string,
    conversationId: string,
    lastReadMessageId?: string,
  ): Promise<{ conversationId: string; lastReadAt: string; unreadCount: number }> {
    // Load and authorize
    const conv = await this.repo.findConversationByIdRaw(conversationId);
    if (!conv) {
      throw new ChatNotFoundException('Conversation not found');
    }
    this.assertParticipant(userId, conv);

    // Resolve candidate lastReadAt
    let candidateDate: Date;
    if (lastReadMessageId) {
      const cursor = await this.repo.hydrateCursor(conversationId, lastReadMessageId);
      if (!cursor) {
        throw new ChatValidationException('lastReadMessageId not found in this conversation');
      }
      candidateDate = cursor.createdAt;
    } else {
      const latest = await this.repo.findLatestMessageCreatedAt(conversationId);
      candidateDate = latest ?? new Date();
    }

    // Determine which column to update
    const column: 'from_last_read_at' | 'to_last_read_at' =
      userId === conv.fromUserId ? 'from_last_read_at' : 'to_last_read_at';

    // Bump (never-decrease)
    const persistedDate = await this.repo.bumpLastReadAt(conversationId, column, candidateDate);

    // Recompute unread count
    const unreadCount = await this.repo.countUnreadFor(userId, conversationId, persistedDate);

    // Fan-out read receipt
    this.realtime.broadcastRead({
      conversationId,
      userId,
      lastReadMessageId: lastReadMessageId ?? null,
      lastReadAt: persistedDate.toISOString(),
      fromUserId: conv.fromUserId,
      toUserId: conv.toUserId,
    });

    return {
      conversationId,
      lastReadAt: persistedDate.toISOString(),
      unreadCount,
    };
  }

  buildAttachmentDescriptors(
    _userId: string,
    files: Express.Multer.File[],
    formFields: Record<string, unknown>,
  ): Attachment_Descriptor[] {
    const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    return files.map((f, i) => {
      const isImage = ALLOWED_IMAGE_MIME.includes(f.mimetype);
      const kind: AttachmentKind = isImage ? 'image' : 'video';

      const descriptor: Attachment_Descriptor = {
        url: `/public/chat-attachments/${f.filename}`,
        type: kind,
        mime: f.mimetype,
        size: f.size,
      };

      // Paired metadata: width[i], height[i], durationMs[i], thumbnailUrl[i]
      const w = parseIntOrUndef(formFields[`width[${i}]`]);
      const h = parseIntOrUndef(formFields[`height[${i}]`]);
      const d = parseIntOrUndef(formFields[`durationMs[${i}]`]);
      const t = typeof formFields[`thumbnailUrl[${i}]`] === 'string'
        ? (formFields[`thumbnailUrl[${i}]`] as string)
        : undefined;

      if (w !== undefined && w >= 1) descriptor.width = w;
      if (h !== undefined && h >= 1) descriptor.height = h;
      if (d !== undefined && d >= 0) descriptor.durationMs = d;
      if (t !== undefined) descriptor.thumbnailUrl = t;

      return descriptor;
    });
  }

  // ── Subscribe authorization helpers ──────────────────────────────────────

  async canSubscribe(userId: string, conversationId: string): Promise<boolean> {
    const conv = await this.repo.findConversationByIdRaw(conversationId);
    if (!conv) return false;
    return userId === conv.fromUserId || userId === conv.toUserId;
  }

  async getParticipatingConversationIds(userId: string): Promise<string[]> {
    return this.repo.listParticipatingConversationIds(userId);
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function parseIntOrUndef(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;
  const n = typeof val === 'number' ? val : parseInt(String(val), 10);
  return Number.isFinite(n) ? n : undefined;
}
