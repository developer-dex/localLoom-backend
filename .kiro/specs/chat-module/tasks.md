# Implementation Plan: Chat Module

## Overview

Implement the chat module at `src/modules/chat/` and the matching socket handler at `src/socket/handlers/chat.handler.ts`, exposing REST endpoints under `/api/v1/chat` and a typed Socket.IO event surface that shares a single canonical write path with the REST layer. Conversations are role-agnostic: any two distinct active users may chat, and rows are stored in canonical UUID order (`from_user_id < to_user_id`) so that `(A,B)` and `(B,A)` collapse to a single key. Work is sequenced foundations → models/migration → validation → repository → rate limiting → realtime → service → upload → REST → socket handler → wiring → docs → rollout, so each task leaves the codebase in a coherent state. Every leaf task references the requirements clauses it satisfies (`_Requirements: R<n>.<m>_`), tracing back to `requirements.md` and `design.md`.

## Tasks

- [x] 1. Foundations and shared types
  - [x] 1.1 Extend the typed Socket.IO contract with the chat payloads and ack shapes
    - Files:
      - `src/socket/socket.types.ts`
    - Add `ServerToClientEvents` entries (`chat:message`, `chat:typing`, `chat:stop-typing`, `chat:read`, `chat:online-status`, `chat:conversation-updated`, `error`) and `ClientToServerEvents` entries (`chat:join`, `chat:leave`, `chat:send-message`, `chat:typing`, `chat:stop-typing`, `chat:mark-read`).
    - Add the new payload types: `MessagePayload` (re-exported from `chat.interface`), `SendMessagePayload`, `ChatMessageEmitPayload`, `TypingPayload`, `ReadPayload`, `OnlineStatusPayload`, `ConversationUpdatedPayload`, `ChatErrorPayload`, `SendMessageAckSuccess`, `SendMessageAckFailure`, `MarkReadAckSuccess`, `MarkReadAckFailure`.
    - Keep the existing `notification:new` entry intact.
    - _Requirements: R10.1, R10.2, R10.3, R10.4, R10.6, R10.8, R10.9, R9.5, R9.6, R9.7, R9.8, R9.9, R9.10, R9.12, R9.14_

  - [x] 1.2 Create the canonical chat domain interfaces
    - Files:
      - `src/modules/chat/chat.interface.ts`
    - Replace placeholder DTOs with `Attachment_Descriptor`, `AttachmentKind`, `SenderSummary`, `OtherParticipantSummary`, `MessagePayload`, `LastMessagePreview`, `ConversationListItem`, `MessageListMeta`, `SendMessageDto`, `CreateConversationDto`, `MarkReadDto`.
    - _Requirements: R12.1, R12.2, R12.3, R12.6, R12.7, R12.8, R4.9, R4.10, R4.11, R4.12, R1.7, R1.8, R1.9, R1.10, R1.11_

  - [x] 1.3 Create the chat error taxonomy and ack mapper
    - Files:
      - `src/modules/chat/chat.errors.ts`
    - Define the `ChatErrorCode` constant (`CHAT_VALIDATION_ERROR`, `CHAT_UNAUTHORIZED`, `CHAT_FORBIDDEN`, `CHAT_NOT_FOUND`, `CHAT_CONFLICT`, `CHAT_RATE_LIMITED`, `CHAT_PAYLOAD_TOO_LARGE`, `CHAT_UPLOAD_FAILED`, `CHAT_AUTOSUBSCRIBE_FAILED`, `CHAT_JOIN_FORBIDDEN`).
    - Implement `ChatException` base class plus subclasses (`ChatValidationException`, `ChatUnauthorizedException`, `ChatForbiddenException`, `ChatNotFoundException`, `ChatConflictException`, `ChatRateLimitedException`, `ChatPayloadTooLargeException`, `ChatUploadFailedException`).
    - Implement and export the `mapErrorToSocketAck(err)` helper used by the socket handler.
    - _Requirements: R16.1, R16.2_

  - [x] 1.4 Extend `CHAT_MESSAGES` with the success keys used by the new controller paths
    - Files:
      - `src/common/constants/messages.ts`
    - Add at minimum `UPLOADED` to `CHAT_MESSAGES`. Do not break or rename existing keys.
    - _Requirements: R14.6_

- [x] 2. Database migration and Sequelize models
  - [x] 2.1 Add the role-agnostic chat schema migration
    - Files:
      - `src/database/migrations/20260520120001-add-chat-read-state.js`
    - Perform the following steps in this exact order, all inside a single transaction:
      1. `renameColumn('conversations', 'customer_id', 'from_user_id')`.
      2. `renameColumn('conversations', 'tradie_id', 'to_user_id')`.
      3. `removeIndex('conversations', 'unique_customer_tradie_conversation')`.
      4. `removeIndex('conversations', ['from_user_id'])` and `removeIndex('conversations', ['to_user_id'])`, plus the legacy auto-named variants `'conversations_customer_id'` / `'conversations_tradie_id'`, each wrapped in `.catch(() => {})` so the step is idempotent across environments where the index name differs or is already absent.
      5. One-time canonical-ordering data swap: `UPDATE conversations SET from_user_id = to_user_id, to_user_id = from_user_id WHERE from_user_id > to_user_id;`. This swap is **non-reversible** — the `down` step cannot recover the original `customer_id` vs `tradie_id` distinction for any row that was swapped, and that is acceptable because the chat module is role-agnostic by design.
      6. `ALTER TABLE conversations ADD CONSTRAINT chk_conversations_from_lt_to CHECK (from_user_id < to_user_id);`.
      7. `addIndex('conversations', ['from_user_id', 'to_user_id'], { unique: true, name: 'unique_from_to_conversation' })`.
      8. `addIndex('conversations', ['from_user_id'])` and `addIndex('conversations', ['to_user_id'])`.
      9. `addColumn('conversations', 'from_last_read_at', { type: DATE, allowNull: true, defaultValue: null })` and `addColumn('conversations', 'to_last_read_at', { type: DATE, allowNull: true, defaultValue: null })`.
      10. `changeColumn('messages', 'type', { type: STRING(20), allowNull: false, defaultValue: 'text' })`.
      11. `CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_desc ON messages (conversation_id, created_at DESC, id DESC);`.
      12. `DROP INDEX IF EXISTS messages_conversation_id_created_at;`.
    - Provide a working `down` that reverses every step in reverse order (re-create the legacy ascending messages index, narrow `messages.type` back to `STRING(10)`, drop the read-state columns, drop the new simple/unique indexes, drop the CHECK constraint, rename `to_user_id` → `tradie_id`, rename `from_user_id` → `customer_id`, and re-add the legacy unique + simple indexes against the legacy column names). The data swap from step 5 is intentionally NOT reversed and the `down` block must include a comment documenting that irreversibility.
    - _Requirements: R11.1, R11.3, R11.4, R11.5, R11.7, R11.8, R3.7, R3.9_

  - [x] 2.2 Update the `Conversation` model with the new column names and read-state fields
    - Files:
      - `src/models/conversation.model.ts`
      - `src/models/index.ts`
    - Rename the Sequelize attributes `customerId` → `fromUserId` (mapped to `from_user_id`) and `tradieId` → `toUserId` (mapped to `to_user_id`).
    - Declare `fromLastReadAt` and `toLastReadAt` as `Date | null`, mapped to `from_last_read_at` / `to_last_read_at` with `defaultValue: null`.
    - Update `IConversationAttributes` and the `Optional<>` set in `IConversationCreationAttributes` accordingly.
    - In `src/models/index.ts`, register `Conversation.belongsTo(User, { foreignKey: 'fromUserId', as: 'fromUser' })`, `Conversation.belongsTo(User, { foreignKey: 'toUserId', as: 'toUser' })`, and the reverse `User.hasMany(Conversation, { foreignKey: 'fromUserId', as: 'sentConversations' })` / `User.hasMany(Conversation, { foreignKey: 'toUserId', as: 'receivedConversations' })`. Remove the legacy customer/tradie aliases.
    - _Requirements: R11.5, R11.8_

  - [x] 2.3 Tighten the `Message` model attachment typing
    - Files:
      - `src/models/message.model.ts`
    - Type `attachments` as `Attachment_Descriptor[] | null`, importing the type from `src/modules/chat/chat.interface`.
    - Set the column `defaultValue` to `null`. Keep the column as `JSONB`, `allowNull: true`.
    - _Requirements: R11.6, R12.1_

- [x] 3. Validation schemas
  - [x] 3.1 Replace `chat.validation.ts` with the full Joi schema set
    - Files:
      - `src/modules/chat/chat.validation.ts`
    - Export `conversationIdParamSchema`, `listConversationsQuerySchema`, `createConversationSchema` (only checks that `otherUserId` is a valid UUID — no role-pair language; the service enforces existence, distinctness, and `users.status <> 'deleted'`), `messagesListQuerySchema`, `attachmentDescriptorSchema`, `sendMessageSchema` (with the `.or('conversationId','recipientId')` and `.custom(...)` cross-field rules from the design), `messageUploadFieldsSchema`, `markReadSchema`.
    - _Requirements: R3.1, R3.2, R4.3, R4.4, R5.2, R5.3, R5.6, R5.7, R5.8, R7.1, R7.5, R12.4, R12.5, R12.6, R12.7, R12.8, R19.5, R19.6_

- [x] 4. Repository layer
  - [x] 4.1 Lay down the repository class with method signatures
    - Files:
      - `src/modules/chat/chat.repository.ts`
    - Replace the placeholder with a `ChatRepository` class containing the full set of public method signatures from the design (one method per data-access concern). Empty/throwing bodies are acceptable in this task; they will be filled in by the next sub-tasks.
    - _Requirements: R14.1, R17.1, R17.2, R17.3, R17.4, R17.5_

  - [x] 4.2 Implement `listConversationsForUser(userId, opts)`
    - Files:
      - `src/modules/chat/chat.repository.ts`
    - Single-statement raw SQL using a `WITH base` CTE, `INNER JOIN users fu ON fu.id = c.from_user_id` and `INNER JOIN users tu ON tu.id = c.to_user_id` (both gated by `status <> 'deleted'`), the `CASE WHEN c.from_user_id = :userId THEN tu.<col> ELSE fu.<col> END` projection for the other-participant fields, the `LEFT JOIN messages lm ON lm.id = c.last_message_id` for the last-message preview, and a correlated `(SELECT count(*) FROM messages ...)` subquery whose `created_at >` predicate uses `COALESCE(CASE WHEN c.from_user_id = :userId THEN c.from_last_read_at ELSE c.to_last_read_at END, 'epoch'::timestamp)` for `unreadCount`.
    - Apply `c.status <> 'deleted'`, the optional `other_name ILIKE :searchPattern`, ordering by `updated_at DESC, id DESC`, and `LIMIT/OFFSET`.
    - Issue the matching `total` count query against the same `WHERE` clause (one extra statement, not per-row).
    - _Requirements: R1.3, R1.4, R1.6, R1.7, R1.8, R1.9, R1.10, R1.11, R1.12, R17.2, R17.3, R17.5_

  - [x] 4.3 Implement single-conversation lookups
    - Files:
      - `src/modules/chat/chat.repository.ts`
    - `findConversationByIdRaw(id)` — same `WITH base` projection as 4.2 but for one row, joined to both `fu` and `tu` participants and to `lm` for the last message. The `other_*` columns are not computed here; the service applies the from/to perspective after the fact.
    - `findConversationByPair(loUserId, hiUserId)` — single-direction lookup with `WHERE c.from_user_id = :lo AND c.to_user_id = :hi`. No `(B,A)` branch is needed because the CHECK constraint `chk_conversations_from_lt_to` guarantees every row is stored in canonical order.
    - _Requirements: R2.3, R3.6, R3.9_

  - [x] 4.4 Implement `listParticipatingConversationIds(userId)`
    - Files:
      - `src/modules/chat/chat.repository.ts`
    - Returns the set of conversation IDs where the user equals `from_user_id` or `to_user_id` and `status <> 'deleted'`. Used by socket auto-subscribe.
    - _Requirements: R8.3_

  - [x] 4.5 Implement keyset message pagination
    - Files:
      - `src/modules/chat/chat.repository.ts`
    - `listMessagesByCursor(conversationId, opts)` using row-value tuple compare `(m.created_at, m.id) < (:cursorCreatedAt, :cursorId)` when a cursor is provided, `LIMIT :limit + 1` to derive `hasMore`, ordered `m.created_at DESC, m.id DESC`, and the `m.is_deleted = false` predicate.
    - _Requirements: R4.5, R4.6, R4.8, R17.1_

  - [x] 4.6 Implement cursor hydration
    - Files:
      - `src/modules/chat/chat.repository.ts`
    - `hydrateCursor(conversationId, beforeId)` returns `{ id, createdAt }` for a message confirmed to belong to the conversation, or `null`. Single Sequelize `findOne`.
    - _Requirements: R4.7_

  - [x] 4.7 Implement transactional message insert
    - Files:
      - `src/modules/chat/chat.repository.ts`
    - `insertMessageInTransaction(input)` wraps `Message.create`, `Conversation.update({ lastMessageId, updatedAt })`, and a fresh `findConversationByIdRaw` re-read in a single `sequelize.transaction(...)`.
    - _Requirements: R5.10, R5.11, R17.4_

  - [x] 4.8 Implement conversation creation and unique-violation detection
    - Files:
      - `src/modules/chat/chat.repository.ts`
    - `createConversation({ fromUserId, toUserId })` performs a plain `Conversation.create` and assumes the caller has already canonicalised the pair so that `fromUserId < toUserId`. Any other ordering will be rejected by the DB CHECK constraint.
    - `isUniqueViolation(err, indexName)` helper detects the new unique constraint `unique_from_to_conversation` for the optimistic-create retry.
    - _Requirements: R3.7, R3.9_

  - [x] 4.9 Implement the never-decrease last-read bump
    - Files:
      - `src/modules/chat/chat.repository.ts`
    - `bumpLastReadAt(conversationId, column, candidate)` uses raw SQL `UPDATE conversations SET <col> = GREATEST(COALESCE(<col>, 'epoch'::timestamp), :candidate) WHERE id = :id RETURNING <col>`.
    - The column name is allow-listed against exactly two literals (`'from_last_read_at'`, `'to_last_read_at'`); any other value throws.
    - _Requirements: R7.6, R7.7_

  - [x] 4.10 Implement unread recompute helpers
    - Files:
      - `src/modules/chat/chat.repository.ts`
    - `countUnreadFor(userId, conversationId, lastReadAt)` and `findLatestMessageCreatedAt(conversationId)`.
    - _Requirements: R7.4, R7.10_

  - [x] 4.11 Implement response mappers
    - Files:
      - `src/modules/chat/chat.repository.ts`
    - `toConversationListItem(row, perspectiveUserId)` projects the other participant as the one whose id is not `perspectiveUserId` (i.e., `row.toUserId` when the perspective equals `row.fromUserId`, else `row.fromUserId`) and `toMessagePayload(row, clientMessageId?)`.
    - Collapse `attachments == null` to `[]`. Encode `Date` values as ISO-8601.
    - _Requirements: R1.7, R1.8, R1.9, R1.10, R4.10, R4.11, R10.9_

- [x] 5. Rate limiting
  - [x] 5.1 Build the chat rate-limit primitives and Express middleware
    - Files:
      - `src/modules/chat/chat.rate-limit.ts`
    - Implement the `ChatSlidingWindowBucket` class.
    - Export `sharedSendBucket` (60 / 60s) and `sharedUploadBucket` (30 / 60s) module singletons so REST and Socket.IO meter against the same accumulator.
    - Export the `chatSendRateLimiter` and `chatUploadRateLimiter` middleware factories that read `req.user.userId`, consume the shared bucket, and short-circuit with HTTP `429` + JSON body `{ error: { code: 'CHAT_RATE_LIMITED', ... } }`.
    - _Requirements: R5.15, R6.12, R9.13, R19.1, R19.2_

- [x] 6. Realtime emitter and Socket.IO server wiring
  - [x] 6.1 Build the typed realtime emitter
    - Files:
      - `src/modules/chat/chat.realtime.ts`
    - Implement the `ChatRealtime` class with `broadcastMessage({ message, fromUserId, toUserId, senderId, fromUserListItem, toUserListItem })`, `broadcastRead`, and `broadcastConversationCreated({ fromUserId, toUserId, fromUserListItem, toUserListItem })`. Every fan-out target uses `user:{fromUserId}` / `user:{toUserId}` rooms; there are no customer/tradie variants.
    - Hold the `Server<ClientToServerEvents, ServerToClientEvents>` instance in a module-scope `chatIoRef` populated lazily.
    - Export `bindChatRealtime(app)` startup hook that pulls `app.get('io')` into `chatIoRef`.
    - Export `setRealtimeIoForTest(io)` test seam.
    - _Requirements: R5.13, R5.14, R7.8, R7.9, R10.1, R10.4, R10.6, R10.7, R18.1, R18.5_

  - [x] 6.2 Wire the realtime emitter into server bootstrap
    - Files:
      - `src/server.ts`
    - Call `bindChatRealtime(app)` immediately after `app.set('io', io)` so the emitter has a valid `io` reference before any request can run.
    - _Requirements: design Configuration / Realtime injection_

- [x] 7. Service layer
  - [x] 7.1 Stand up the `ChatService` skeleton
    - Files:
      - `src/modules/chat/chat.service.ts`
    - Replace the placeholder with a `ChatService` class that takes `repo`, `realtime`, and `sendBucket` via constructor injection (with sensible defaults).
    - Implement the private `assertParticipant(userId, conv)` helper that throws `ChatForbiddenException` when `userId !== conv.fromUserId && userId !== conv.toUserId`.
    - _Requirements: R14.1, R15.1, R15.2, R15.4_

  - [x] 7.2 Implement attachment-set validation
    - Files:
      - `src/modules/chat/chat.service.ts`
    - `validateAttachments(arr)` enforces R12: max 5 entries, allowed `type` values, `url` prefix, presence of `mime` and non-negative `size`.
    - Throws `ChatValidationException` on the first failing rule.
    - _Requirements: R12.4, R12.5, R12.7, R12.8, R19.6_

  - [x] 7.3 Implement message-type resolution
    - Files:
      - `src/modules/chat/chat.service.ts`
    - `resolveMessageType(suppliedType, attachments)` derives `text | image | video | mixed` from the attachment set.
    - When the supplied type is media-typed but inconsistent with the attachment set, throw `ChatValidationException`.
    - _Requirements: R5.6, R5.9_

  - [x] 7.4 Implement `listConversations`
    - Files:
      - `src/modules/chat/chat.service.ts`
    - Delegates to `repo.listConversationsForUser`, maps each row via `repo.toConversationListItem(row, userId)` so the from/to perspective is applied per request, returns the paginated result.
    - _Requirements: R1.3, R1.4, R1.5, R1.6, R1.7, R1.8, R1.9, R1.10, R1.11, R1.12_

  - [x] 7.5 Implement `getConversation`
    - Files:
      - `src/modules/chat/chat.service.ts`
    - Loads the conversation, runs `assertParticipant`, maps via `toConversationListItem`. Throws `ChatNotFoundException` when missing.
    - _Requirements: R2.3, R2.4, R2.5_

  - [x] 7.6 Implement `getOrCreateConversation`
    - Files:
      - `src/modules/chat/chat.service.ts`
    - Self-check (`otherUserId === userId` → `ChatValidationException`) and dual-user fetch (reject when either user is missing or has `users.status === 'deleted'`). No role-pair check is applied — any two distinct, non-deleted users are eligible.
    - Sort the two UUIDs lexicographically: `lo = min(userId, otherUserId)`, `hi = max(userId, otherUserId)`. Initial lookup uses `repo.findConversationByPair(lo, hi)`. If absent, optimistically `repo.createConversation({ fromUserId: lo, toUserId: hi })`. On `repo.isUniqueViolation(err, 'unique_from_to_conversation')` retry once by re-reading with `repo.findConversationByPair(lo, hi)`.
    - On `created === true`, call `realtime.broadcastConversationCreated({ fromUserId: lo, toUserId: hi, fromUserListItem, toUserListItem })` with each participant's perspective list-item.
    - _Requirements: R3.3, R3.4, R3.5, R3.6, R3.7, R3.8, R3.9, R10.7_

  - [x] 7.7 Implement `listMessages`
    - Files:
      - `src/modules/chat/chat.service.ts`
    - Auth check, `repo.hydrateCursor` when `before` is supplied, `repo.listMessagesByCursor`, build `MessageListMeta` (`limit`, `count`, `hasMore`, `nextBefore`).
    - _Requirements: R4.2, R4.3, R4.4, R4.5, R4.6, R4.7, R4.8, R4.9, R4.10, R4.11, R4.12_

  - [x] 7.8 Implement `sendMessage` (canonical write path)
    - Files:
      - `src/modules/chat/chat.service.ts`
    - Sequence: rate-limit consume → conversation resolution (`conversationId`-only / `recipientId`-only / both with consistency check) → `assertParticipant` → `validateAttachments` → `resolveMessageType` → `repo.insertMessageInTransaction` → `repo.toMessagePayload` → build the from/to perspective list-items via `repo.toConversationListItem(conv, conv.fromUserId)` and `repo.toConversationListItem(conv, conv.toUserId)` → `realtime.broadcastMessage({ message, fromUserId: conv.fromUserId, toUserId: conv.toUserId, senderId: userId, fromUserListItem, toUserListItem })`.
    - _Requirements: R5.4, R5.5, R5.7, R5.8, R5.9, R5.10, R5.11, R5.12, R5.13, R5.14, R5.15, R9.13, R12.4, R12.5, R12.6, R12.7, R12.8, R17.4, R18.3, R18.4, R18.5, R19.1_

  - [x] 7.9 Implement `markRead`
    - Files:
      - `src/modules/chat/chat.service.ts`
    - Auth check, candidate `lastReadAt` resolution (use `repo.findLatestMessageCreatedAt` when no `lastReadMessageId`, fall back to `now()` for empty conversations), routing the persisted column by participant: `userId === conv.fromUserId` → `'from_last_read_at'`, `userId === conv.toUserId` → `'to_last_read_at'`. Call `repo.bumpLastReadAt` (never-decrease semantics), then `repo.countUnreadFor` recompute and `realtime.broadcastRead`.
    - _Requirements: R7.2, R7.3, R7.4, R7.5, R7.6, R7.7, R7.8, R7.9, R7.10, R10.4, R10.6_

  - [x] 7.10 Implement attachment descriptor builder for upload pipeline
    - Files:
      - `src/modules/chat/chat.service.ts`
    - `buildAttachmentDescriptors(userId, files, formFields)` maps each `Express.Multer.File` to an `Attachment_Descriptor`, picks `image` / `video` from MIME, and attaches indexed paired metadata (`width[i]`, `height[i]`, `durationMs[i]`, `thumbnailUrl[i]`) when the supplied values are syntactically valid.
    - _Requirements: R6.7, R6.8, R6.9, R6.10_

  - [x] 7.11 Implement subscribe authorization helpers
    - Files:
      - `src/modules/chat/chat.service.ts`
    - `canSubscribe(userId, conversationId)` for `chat:join` and `getParticipatingConversationIds(userId)` for socket auto-subscribe (delegates to `repo.listParticipatingConversationIds`).
    - _Requirements: R8.3, R9.1, R9.3_

- [x] 8. File upload helper
  - [x] 8.1 Add the chat-attachment multer factory
    - Files:
      - `src/services/file-upload.service.ts`
    - Add `createChatAttachmentUpload(fieldName='files')` per the design: image MIME allow-list (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), video MIME allow-list (`video/mp4`, `video/quicktime`, `video/webm`), 50MB ceiling at the multer layer, `multer.diskStorage` writing under `public/chat-attachments/` with `${timestamp}-${random}${ext}` filenames, returning `.array(fieldName, 5)`.
    - _Requirements: R6.3, R6.4, R6.5, R13.1, R13.2, R13.3, R13.4, R13.5, R13.6_

  - [x] 8.2 Add per-MIME size enforcement helper for the controller
    - Files:
      - `src/modules/chat/chat.controller.ts`
    - Add `enforcePerMimeSize(files)` that checks 10MB per image and 50MB per video, best-effort `fs.unlink` on rejected files, then throws `ChatPayloadTooLargeException`.
    - _Requirements: R6.6_

- [x] 9. REST controller, routes, swagger, and barrel exports
  - [x] 9.1 Implement `ChatController`
    - Files:
      - `src/modules/chat/chat.controller.ts`
    - Replace placeholder with seven `asyncHandler` arrow methods: `listConversations`, `getConversation`, `createOrGetConversation`, `listMessages`, `sendMessage`, `uploadAttachments`, `markRead`. Use `ApiResponse.success` / `ApiResponse.created` / `ApiResponse.paginated` and the `CHAT_MESSAGES` constants.
    - _Requirements: R1.1, R2.1, R3.1, R4.1, R5.1, R6.1, R7.1, R14.1, R14.4_

  - [x] 9.2 Implement chat REST routes
    - Files:
      - `src/modules/chat/chat.routes.ts`
    - `authenticateUser` at the router level, route-scoped `express.json({ limit: '1mb' })` for JSON-bodied endpoints, the seven endpoints in the order defined by the design, and the exact middleware chain per endpoint (validate → rate-limit → upload → controller).
    - _Requirements: R1.1, R2.1, R3.1, R4.1, R5.1, R6.1, R7.1, R14.2, R14.3, R19.4_

  - [x] 9.3 Author the chat OpenAPI / Swagger documentation
    - Files:
      - `src/modules/chat/chat.swagger.ts`
    - Add `@swagger` JSDoc blocks for all seven REST endpoints (request body, query, params, success and error responses keyed by `error.code`).
    - Include a free-form description block enumerating Server-to-Client and Client-to-Server Socket.IO events with payload shapes and ack contracts (per R16.4).
    - _Requirements: R16.3, R16.4_

  - [x] 9.4 Update the chat module barrel
    - Files:
      - `src/modules/chat/index.ts`
    - Export `chatRoutes`, `ChatController`, `ChatService`, `ChatRepository`, `ChatRealtime`, `bindChatRealtime`, `sharedSendBucket`, `sharedUploadBucket`, plus the chat error types.
    - _Requirements: R14.1_

- [x] 10. Socket.IO handler
  - [x] 10.1 Rebuild `chat.handler.ts` with auto-subscribe
    - Files:
      - `src/socket/handlers/chat.handler.ts`
    - `registerChatHandlers(io, socket)` ensures `socket.join('user:{userId}')`, then non-blocking `await repo.listParticipatingConversationIds(userId)` to join each `conversation:{id}`. On failure log and emit `error` Server_Event with `code: 'CHAT_AUTOSUBSCRIBE_FAILED'`; do not disconnect.
    - _Requirements: R8.2, R8.3, R8.5_

  - [x] 10.2 Implement the 64KB payload size guard
    - Files:
      - `src/socket/handlers/chat.handler.ts`
    - `payloadTooLarge(data)` uses `Buffer.byteLength(JSON.stringify(data), 'utf8') > 64 * 1024`. Apply on every ack-bearing client event before any other processing.
    - _Requirements: R9.14, R10.8, R19.3_

  - [x] 10.3 Implement `chat:join` and `chat:leave`
    - Files:
      - `src/socket/handlers/chat.handler.ts`
    - Validate `conversationId` UUID, call `service.canSubscribe`, then `socket.join` / `socket.leave`. On failure emit `error` Server_Event with `code: 'CHAT_JOIN_FORBIDDEN'`.
    - _Requirements: R9.1, R9.2, R9.3, R9.4_

  - [x] 10.4 Implement `chat:send-message`
    - Files:
      - `src/socket/handlers/chat.handler.ts`
    - Run payload size guard → `sendMessageSchema.validate` → `service.sendMessage(userId, dto)`. Ack with `{ success: true, message, clientMessageId? }` on success; on error use `mapErrorToSocketAck` to return `{ success: false, error: { code, message } }` and skip emission.
    - _Requirements: R9.5, R9.6, R9.7, R9.8, R18.3_

  - [x] 10.5 Implement `chat:typing` and `chat:stop-typing` with throttling
    - Files:
      - `src/socket/handlers/chat.handler.ts`
    - Per-socket `ChatTypingThrottle` (capacity 5, refill 5/s) silently drops over-the-limit events. Broadcast via `socket.to('conversation:{id}').emit(...)` excluding the originator. Payload `{ conversationId, userId, name }`.
    - _Requirements: R9.9, R9.10, R9.11, R10.2, R10.3_

  - [x] 10.6 Implement `chat:mark-read`
    - Files:
      - `src/socket/handlers/chat.handler.ts`
    - Payload size guard → `markReadSchema.validate` → `service.markRead`. Ack mirrors the REST result; on failure use `mapErrorToSocketAck`.
    - _Requirements: R9.12, R10.4_

  - [x] 10.7 Place `ChatTypingThrottle` near `ChatRealtime` and instantiate per socket
    - Files:
      - `src/modules/chat/chat.realtime.ts`
      - `src/socket/handlers/chat.handler.ts`
    - Export `ChatTypingThrottle` from `chat.realtime.ts` (or a sibling file) and instantiate one per socket inside `registerChatHandlers`.
    - _Requirements: R9.11_

- [x] 11. Wiring and integration
  - [x] 11.1 Verify the chat router mount at `/api/v1/chat`
    - Files:
      - `src/routes/v1/index.ts`
      - `src/modules/chat/index.ts`
    - Confirm the existing `/chat` mount picks up the new router via the barrel export. Adjust only if the barrel export shape changed.
    - _Requirements: R14.1_

  - [x] 11.2 Verify socket bootstrap still calls `registerChatHandlers` and preserves online-status
    - Files:
      - `src/socket/index.ts`
    - Confirm `registerChatHandlers(io, authSocket)` is still invoked on `connection` and that the existing `chat:online-status` broadcast logic is preserved verbatim. Do not modify the online-status logic in this iteration.
    - _Requirements: R10.5_

- [x] 12. Documentation
  - [x] 12.1 Backend chat API reference
    - Files:
      - `localloom-backend/development-docs/api-chat-documentation.md`
    - Document REST endpoints with request/response examples, the error-code table, and the Socket.IO event matrix (Client → Server and Server → Client) including payload shapes and ack contracts. The mobile-facing reference is a separate follow-up artefact and is out of scope here per R20.5.
    - _Requirements: R16.3, R16.4, R20.5_

  - [x] 12.2 Module-level notes for read-state and role-agnostic semantics
    - Files:
      - `src/modules/chat/chat.service.ts`
    - Add a short module-level doc block explaining: (a) the `NULL` Last_Read_At backfill semantics (treated as `'epoch'`), (b) the canonical from/to ordering convention (`from_user_id < to_user_id`) is a storage-only invariant with no read or write semantic distinction between the two columns, and (c) the banned/suspended-user follow-up hook.
    - _Requirements: R11.1, R11.5, R15.5_

- [x] 13. Migration and rollout checkpoint
  - [x] 13.1 Document the deploy / migrate / enable order
    - Files:
      - `localloom-backend/development-docs/api-chat-documentation.md`
    - Capture the run order in the doc and / or PR description: deploy code (backwards compatible) → run migration `20260520120001-add-chat-read-state.js` → enable new endpoints. Call out that the migration's step-5 canonical-order data swap is non-reversible; rollback restores column NAMES but cannot restore the original `customer_id` vs `tradie_id` distinction for swapped rows.
    - _Requirements: design Migration Strategy_

  - [x] 13.2 Final build checkpoint
    - Run `npm run build` after each major task group to confirm the TypeScript compile is clean. Ask the user if any blocking questions arise.

## Notes

- Every leaf task references the requirements clauses it implements (`_Requirements: R<n>.<m>_`).
- The shared write path (`ChatService.sendMessage`) is built once and reused by both REST and Socket.IO transports; rate-limit accounting goes through the same `sharedSendBucket` instance.
- Migration `20260520120001-add-chat-read-state.js` performs an idempotent rename + canonical-order data swap; the swap is non-reversible — `down` restores column names and indexes but cannot restore the original `customer_id` / `tradie_id` distinction for any row that was swapped.
- No test tasks are included in this plan per user request; unit, integration, repository, service, REST, socket, and property-based tests are out of scope for this iteration.
