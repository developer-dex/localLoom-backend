// ─── Attachment types ─────────────────────────────────────────────────────────

export type AttachmentKind = 'image' | 'video';

export interface Attachment_Descriptor {
  /** Public URL path. MUST start with '/public/chat-attachments/'. */
  url: string;
  /** Discriminator: 'image' or 'video'. */
  type: AttachmentKind;
  /** Original MIME type as observed by multer. */
  mime: string;
  /** File size in bytes; integer ≥ 0. */
  size: number;

  /** Optional client-supplied metadata. */
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

// ─── Participant summaries ───────────────────────────────────────────────────

export interface SenderSummary {
  id: string;
  name: string;
  avatar: string | null;
}

export interface OtherParticipantSummary {
  id: string;
  name: string;
  avatar: string | null;
  /**
   * Literal `users.role` of the other participant. Informational metadata only:
   * the chat module does not read, branch on, or enforce anything based on this value.
   */
  role: string;
}

// ─── Message payload ─────────────────────────────────────────────────────────

export interface MessagePayload {
  id: string;
  conversationId: string;
  sender: SenderSummary;
  content: string;
  type: 'text' | 'image' | 'video' | 'mixed';
  attachments: Attachment_Descriptor[];
  status: string;
  createdAt: string;
  updatedAt: string;
  /** Echoed back when the originating call supplied one. */
  clientMessageId?: string;
}

// ─── Conversation list types ─────────────────────────────────────────────────

export interface LastMessagePreview {
  id: string;
  content: string;
  type: string;
  attachmentCount: number;
  senderId: string;
  createdAt: string;
}

export interface ConversationListItem {
  id: string;
  /** The participant whose id ≠ the requester's id. */
  otherParticipant: OtherParticipantSummary;
  lastMessage: LastMessagePreview | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Message list meta ───────────────────────────────────────────────────────

export interface MessageListMeta {
  limit: number;
  count: number;
  hasMore: boolean;
  nextBefore: string | null;
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface SendMessageDto {
  conversationId?: string;
  recipientId?: string;
  content?: string;
  type?: 'text' | 'image' | 'video' | 'mixed';
  attachments?: Attachment_Descriptor[];
  clientMessageId?: string;
}

export interface CreateConversationDto {
  otherUserId: string;
}

export interface MarkReadDto {
  lastReadMessageId?: string;
}
