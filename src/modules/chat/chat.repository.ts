import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../../config/database';
import { Conversation } from '../../models/conversation.model';
import { Message } from '../../models/message.model';
import { InternalServerException } from '../../common/exceptions';
import type {
  Attachment_Descriptor,
  ConversationListItem,
  LastMessagePreview,
  MessagePayload,
  OtherParticipantSummary,
  SenderSummary,
} from './chat.interface';

// ─── Row projection types (internal) ────────────────────────────────────────

export interface ConversationRowProjection {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  lastMessageId: string | null;
  fromLastReadAt: Date | null;
  toLastReadAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // From-user fields
  fromUserName: string;
  fromUserAvatar: string | null;
  fromUserRole: string;
  // To-user fields
  toUserName: string;
  toUserAvatar: string | null;
  toUserRole: string;
  // Last message preview
  lastMessageIdFull: string | null;
  lastMessageContent: string | null;
  lastMessageType: string | null;
  lastMessageSenderId: string | null;
  lastMessageCreatedAt: Date | null;
  lastMessageAttachmentCount: number;
}

export interface ConversationListRowProjection extends ConversationRowProjection {
  otherName: string;
  otherAvatar: string | null;
  otherRole: string;
  otherId: string;
  unreadCount: number;
}

export interface MessageRow {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  status: string;
  attachments: Attachment_Descriptor[] | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  senderName: string;
  senderAvatar: string | null;
}

// ─── Repository ──────────────────────────────────────────────────────────────

export class ChatRepository {
  // ── Conversation list ────────────────────────────────────────────────────

  async listConversationsForUser(
    userId: string,
    opts: { page: number; limit: number; search?: string },
  ): Promise<{ rows: ConversationListRowProjection[]; total: number }> {
    const { page, limit, search } = opts;
    const offset = (page - 1) * limit;
    const searchPattern = search ? `%${search}%` : null;

    const replacements: Record<string, unknown> = {
      userId,
      search: search || null,
      searchPattern,
      limit,
      offset,
    };

    const rows = await sequelize.query<ConversationListRowProjection>(
      `
      WITH base AS (
        SELECT
          c.id,
          c.from_user_id   AS "fromUserId",
          c.to_user_id     AS "toUserId",
          c.status,
          c.last_message_id AS "lastMessageId",
          c.from_last_read_at AS "fromLastReadAt",
          c.to_last_read_at  AS "toLastReadAt",
          c.created_at AS "createdAt",
          c.updated_at AS "updatedAt",
          -- Other-participant projection
          CASE WHEN c.from_user_id = :userId THEN tu.id     ELSE fu.id     END AS "otherId",
          CASE WHEN c.from_user_id = :userId THEN tu.name   ELSE fu.name   END AS "otherName",
          CASE WHEN c.from_user_id = :userId THEN tu.avatar ELSE fu.avatar END AS "otherAvatar",
          CASE WHEN c.from_user_id = :userId THEN tu.role   ELSE fu.role   END AS "otherRole",
          -- From/To user fields (for mappers)
          fu.name   AS "fromUserName",
          fu.avatar AS "fromUserAvatar",
          fu.role   AS "fromUserRole",
          tu.name   AS "toUserName",
          tu.avatar AS "toUserAvatar",
          tu.role   AS "toUserRole",
          -- Last message preview
          lm.id         AS "lastMessageIdFull",
          lm.content    AS "lastMessageContent",
          lm.type       AS "lastMessageType",
          lm.sender_id  AS "lastMessageSenderId",
          lm.created_at AS "lastMessageCreatedAt",
          COALESCE(jsonb_array_length(lm.attachments), 0) AS "lastMessageAttachmentCount",
          -- Unread count
          (
            SELECT COUNT(*)::int
            FROM messages m
            WHERE m.conversation_id = c.id
              AND m.is_deleted = false
              AND m.sender_id <> :userId
              AND m.created_at > COALESCE(
                    CASE WHEN c.from_user_id = :userId THEN c.from_last_read_at ELSE c.to_last_read_at END,
                    'epoch'::timestamp
                  )
          ) AS "unreadCount"
        FROM conversations c
        INNER JOIN users fu ON fu.id = c.from_user_id AND fu.status <> 'deleted'
        INNER JOIN users tu ON tu.id = c.to_user_id   AND tu.status <> 'deleted'
        LEFT  JOIN messages lm ON lm.id = c.last_message_id
        WHERE c.status <> 'deleted'
          AND (c.from_user_id = :userId OR c.to_user_id = :userId)
      )
      SELECT * FROM base
      WHERE :search::text IS NULL OR "otherName" ILIKE :searchPattern
      ORDER BY "updatedAt" DESC, id DESC
      LIMIT :limit OFFSET :offset;
      `,
      { replacements, type: QueryTypes.SELECT },
    );

    // Total count query
    const [countResult] = await sequelize.query<{ total: number }>(
      `
      SELECT COUNT(*)::int AS total
      FROM conversations c
      INNER JOIN users fu ON fu.id = c.from_user_id AND fu.status <> 'deleted'
      INNER JOIN users tu ON tu.id = c.to_user_id   AND tu.status <> 'deleted'
      WHERE c.status <> 'deleted'
        AND (c.from_user_id = :userId OR c.to_user_id = :userId)
        AND (
          :search::text IS NULL OR
          (CASE WHEN c.from_user_id = :userId THEN tu.name ELSE fu.name END) ILIKE :searchPattern
        );
      `,
      { replacements, type: QueryTypes.SELECT },
    );

    return { rows, total: countResult?.total ?? 0 };
  }

  // ── Single-conversation lookups ──────────────────────────────────────────

  async findConversationByIdRaw(
    id: string,
    options?: { transaction?: Transaction },
  ): Promise<ConversationRowProjection | null> {
    const rows = await sequelize.query<ConversationRowProjection>(
      `
      SELECT
        c.id,
        c.from_user_id   AS "fromUserId",
        c.to_user_id     AS "toUserId",
        c.status,
        c.last_message_id AS "lastMessageId",
        c.from_last_read_at AS "fromLastReadAt",
        c.to_last_read_at  AS "toLastReadAt",
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt",
        fu.name   AS "fromUserName",
        fu.avatar AS "fromUserAvatar",
        fu.role   AS "fromUserRole",
        tu.name   AS "toUserName",
        tu.avatar AS "toUserAvatar",
        tu.role   AS "toUserRole",
        lm.id         AS "lastMessageIdFull",
        lm.content    AS "lastMessageContent",
        lm.type       AS "lastMessageType",
        lm.sender_id  AS "lastMessageSenderId",
        lm.created_at AS "lastMessageCreatedAt",
        COALESCE(jsonb_array_length(lm.attachments), 0) AS "lastMessageAttachmentCount"
      FROM conversations c
      INNER JOIN users fu ON fu.id = c.from_user_id AND fu.status <> 'deleted'
      INNER JOIN users tu ON tu.id = c.to_user_id   AND tu.status <> 'deleted'
      LEFT  JOIN messages lm ON lm.id = c.last_message_id
      WHERE c.id = :id AND c.status <> 'deleted';
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
        transaction: options?.transaction,
      },
    );

    return rows[0] ?? null;
  }

  async findConversationByPair(
    loUserId: string,
    hiUserId: string,
  ): Promise<ConversationRowProjection | null> {
    const rows = await sequelize.query<ConversationRowProjection>(
      `
      SELECT
        c.id,
        c.from_user_id   AS "fromUserId",
        c.to_user_id     AS "toUserId",
        c.status,
        c.last_message_id AS "lastMessageId",
        c.from_last_read_at AS "fromLastReadAt",
        c.to_last_read_at  AS "toLastReadAt",
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt",
        fu.name   AS "fromUserName",
        fu.avatar AS "fromUserAvatar",
        fu.role   AS "fromUserRole",
        tu.name   AS "toUserName",
        tu.avatar AS "toUserAvatar",
        tu.role   AS "toUserRole",
        lm.id         AS "lastMessageIdFull",
        lm.content    AS "lastMessageContent",
        lm.type       AS "lastMessageType",
        lm.sender_id  AS "lastMessageSenderId",
        lm.created_at AS "lastMessageCreatedAt",
        COALESCE(jsonb_array_length(lm.attachments), 0) AS "lastMessageAttachmentCount"
      FROM conversations c
      INNER JOIN users fu ON fu.id = c.from_user_id AND fu.status <> 'deleted'
      INNER JOIN users tu ON tu.id = c.to_user_id   AND tu.status <> 'deleted'
      LEFT  JOIN messages lm ON lm.id = c.last_message_id
      WHERE c.from_user_id = :lo AND c.to_user_id = :hi AND c.status <> 'deleted';
      `,
      { replacements: { lo: loUserId, hi: hiUserId }, type: QueryTypes.SELECT },
    );

    return rows[0] ?? null;
  }

  // ── Participating conversation IDs (for socket auto-subscribe) ───────────

  async listParticipatingConversationIds(userId: string): Promise<string[]> {
    const rows = await sequelize.query<{ id: string }>(
      `
      SELECT c.id
      FROM conversations c
      WHERE (c.from_user_id = :userId OR c.to_user_id = :userId)
        AND c.status <> 'deleted';
      `,
      { replacements: { userId }, type: QueryTypes.SELECT },
    );

    return rows.map((r) => r.id);
  }

  // ── Keyset message pagination ────────────────────────────────────────────

  async listMessagesByCursor(
    conversationId: string,
    opts: { limit: number; cursor: { createdAt: Date; id: string } | null },
  ): Promise<{ items: MessageRow[]; hasMore: boolean }> {
    const { limit, cursor } = opts;

    const replacements: Record<string, unknown> = {
      conversationId,
      cursorCreatedAt: cursor?.createdAt ?? null,
      cursorId: cursor?.id ?? null,
      limit: limit + 1,
    };

    const rows = await sequelize.query<MessageRow>(
      `
      SELECT
        m.id,
        m.conversation_id AS "conversationId",
        m.sender_id       AS "senderId",
        m.content,
        m.type,
        m.status,
        m.attachments,
        m.is_deleted      AS "isDeleted",
        m.created_at      AS "createdAt",
        m.updated_at      AS "updatedAt",
        u.name   AS "senderName",
        u.avatar AS "senderAvatar"
      FROM messages m
      INNER JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = :conversationId
        AND m.is_deleted = false
        AND (
          :cursorCreatedAt::timestamptz IS NULL
          OR (m.created_at, m.id) < (:cursorCreatedAt, :cursorId::uuid)
        )
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT :limit;
      `,
      { replacements, type: QueryTypes.SELECT },
    );

    const hasMore = rows.length > limit;
    if (hasMore) {
      rows.pop();
    }

    return { items: rows, hasMore };
  }

  // ── Cursor hydration ─────────────────────────────────────────────────────

  async hydrateCursor(
    conversationId: string,
    beforeId: string,
  ): Promise<{ id: string; createdAt: Date } | null> {
    const row = await Message.findOne({
      where: { id: beforeId, conversationId, isDeleted: false },
      attributes: ['id', 'createdAt'],
    });

    return row ? { id: row.id, createdAt: row.createdAt } : null;
  }

  // ── Transactional message insert ─────────────────────────────────────────

  async insertMessageInTransaction(input: {
    conversationId: string;
    senderId: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'mixed';
    attachments: Attachment_Descriptor[] | null;
  }): Promise<{ message: Message; conversation: ConversationRowProjection }> {
    return sequelize.transaction(async (tx) => {
      const message = await Message.create(
        {
          conversationId: input.conversationId,
          senderId: input.senderId,
          content: input.content,
          type: input.type,
          status: 'sent',
          attachments: input.attachments,
          isDeleted: false,
        },
        { transaction: tx },
      );

      await Conversation.update(
        { lastMessageId: message.id, updatedAt: message.createdAt },
        { where: { id: input.conversationId }, transaction: tx, silent: false },
      );

      const conversation = await this.findConversationByIdRaw(input.conversationId, { transaction: tx });
      if (!conversation) {
        throw new InternalServerException('Conversation disappeared during send');
      }

      return { message, conversation };
    });
  }

  // ── Conversation creation + unique-violation detection ───────────────────

  async createConversation(input: { fromUserId: string; toUserId: string }): Promise<Conversation> {
    return Conversation.create({
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      status: 'active',
      fromLastReadAt: null,
      toLastReadAt: null,
    });
  }

  isUniqueViolation(err: unknown, indexName: string): boolean {
    if (
      err &&
      typeof err === 'object' &&
      'name' in err &&
      (err as { name: string }).name === 'SequelizeUniqueConstraintError'
    ) {
      const fields = (err as { fields?: Record<string, unknown> }).fields;
      const parent = (err as { parent?: { constraint?: string } }).parent;
      if (parent?.constraint === indexName) return true;
      if (fields && Object.keys(fields).length > 0) return true;
    }
    return false;
  }

  // ── Never-decrease last-read bump ────────────────────────────────────────

  async bumpLastReadAt(
    conversationId: string,
    column: 'from_last_read_at' | 'to_last_read_at',
    candidate: Date,
  ): Promise<Date> {
    // Allow-list the column name to prevent SQL injection
    const allowedColumns = ['from_last_read_at', 'to_last_read_at'] as const;
    if (!allowedColumns.includes(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }

    const [rows] = await sequelize.query<{ last_read_at: string }>(
      `
      UPDATE conversations
      SET ${column} = GREATEST(COALESCE(${column}, 'epoch'::timestamp), :candidate)
      WHERE id = :conversationId
      RETURNING ${column} AS last_read_at;
      `,
      {
        replacements: { candidate, conversationId },
        type: QueryTypes.SELECT,
      },
    );

    return new Date(rows.last_read_at);
  }

  // ── Unread recompute helpers ─────────────────────────────────────────────

  async countUnreadFor(
    userId: string,
    conversationId: string,
    lastReadAt: Date | null,
  ): Promise<number> {
    const [result] = await sequelize.query<{ count: number }>(
      `
      SELECT COUNT(*)::int AS count
      FROM messages
      WHERE conversation_id = :conversationId
        AND is_deleted = false
        AND sender_id <> :userId
        AND created_at > COALESCE(:lastReadAt, 'epoch'::timestamp);
      `,
      {
        replacements: { conversationId, userId, lastReadAt },
        type: QueryTypes.SELECT,
      },
    );

    return result?.count ?? 0;
  }

  async findLatestMessageCreatedAt(conversationId: string): Promise<Date | null> {
    const [result] = await sequelize.query<{ created_at: string }>(
      `
      SELECT created_at
      FROM messages
      WHERE conversation_id = :conversationId AND is_deleted = false
      ORDER BY created_at DESC, id DESC
      LIMIT 1;
      `,
      { replacements: { conversationId }, type: QueryTypes.SELECT },
    );

    return result ? new Date(result.created_at) : null;
  }

  // ── Response mappers ─────────────────────────────────────────────────────

  toConversationListItem(
    row: ConversationRowProjection,
    perspectiveUserId: string,
  ): ConversationListItem {
    const isFromUser = row.fromUserId === perspectiveUserId;

    const otherParticipant: OtherParticipantSummary = {
      id: isFromUser ? row.toUserId : row.fromUserId,
      name: isFromUser ? row.toUserName : row.fromUserName,
      avatar: isFromUser ? row.toUserAvatar : row.fromUserAvatar,
      role: isFromUser ? row.toUserRole : row.fromUserRole,
    };

    let lastMessage: LastMessagePreview | null = null;
    if (row.lastMessageIdFull) {
      lastMessage = {
        id: row.lastMessageIdFull,
        content: row.lastMessageContent ?? '',
        type: row.lastMessageType ?? 'text',
        attachmentCount: row.lastMessageAttachmentCount ?? 0,
        senderId: row.lastMessageSenderId ?? '',
        createdAt: row.lastMessageCreatedAt
          ? new Date(row.lastMessageCreatedAt).toISOString()
          : new Date(row.createdAt).toISOString(),
      };
    }

    const lastMessageAt = row.lastMessageCreatedAt
      ? new Date(row.lastMessageCreatedAt).toISOString()
      : new Date(row.createdAt).toISOString();

    return {
      id: row.id,
      otherParticipant,
      lastMessage,
      lastMessageAt,
      unreadCount: (row as ConversationListRowProjection).unreadCount ?? 0,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  toMessagePayload(row: MessageRow, clientMessageId?: string): MessagePayload {
    const sender: SenderSummary = {
      id: row.senderId,
      name: row.senderName,
      avatar: row.senderAvatar,
    };

    const payload: MessagePayload = {
      id: row.id,
      conversationId: row.conversationId,
      sender,
      content: row.content,
      type: row.type as 'text' | 'image' | 'video' | 'mixed',
      attachments: row.attachments ?? [],
      status: row.status,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };

    if (clientMessageId) {
      payload.clientMessageId = clientMessageId;
    }

    return payload;
  }
}
