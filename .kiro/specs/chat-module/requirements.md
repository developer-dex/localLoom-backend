# Requirements Document

## Introduction

The Chat Module adds real-time 1:1 messaging between any two distinct LocalLoom users to the backend. It exposes a versioned REST API for conversation and message CRUD plus attachment uploads, and a Socket.IO real-time layer that delivers new messages, typing indicators, read receipts, online presence, and conversation list updates to connected clients.

The feature is implemented entirely on the LocalLoom Node.js / Express / TypeScript / Sequelize / PostgreSQL backend, mounted under `/api/v1/chat`. Real-time delivery uses the existing Socket.IO server initialized in `src/socket/index.ts` and the existing JWT-authenticated socket middleware. The existing `Conversation` and `Message` Sequelize models are reused and extended; new schema additions are introduced through a new migration. Mobile clients consume both the REST endpoints and the Socket.IO events; the corresponding mobile-facing developer documentation is produced as a separate artefact and is out of scope for this spec.

Conversations are role-agnostic. Any two distinct active LocalLoom users may exchange messages, including two users who both have `users.role = 'tradie'` or both have `users.role = 'customer'`. The `users.role` field is surfaced through the API as informational metadata on the Other_Participant projection, but the chat module performs no role-based authorisation or pairing check beyond confirming that both participants exist and are not deleted.

## Glossary

- **Chat_API**: The collection of REST endpoints mounted at `/api/v1/chat` and exported by `src/modules/chat/chat.routes.ts`.
- **Chat_Service**: The backend service class in `src/modules/chat/chat.service.ts` that orchestrates conversation creation, message persistence, attachment validation, unread tracking, and real-time broadcast.
- **Chat_Repository**: The data-access class in `src/modules/chat/chat.repository.ts` that issues Sequelize queries against `conversations` and `messages`.
- **Chat_Socket_Handler**: The Socket.IO handler registered in `src/socket/handlers/chat.handler.ts` that listens for and emits chat events on an authenticated socket connection.
- **Authenticated_User**: A LocalLoom end-user who has presented a valid JWT access token via the existing user authentication middleware (`authenticateUser`) for REST or via the existing socket auth middleware (`socketAuthMiddleware`) for Socket.IO.
- **Conversation**: A row in the `conversations` table representing a 1:1 chat between exactly two distinct LocalLoom users, regardless of their role. Identified by `conversations.id` (UUID).
- **Participant**: One of the two `users` rows referenced by a Conversation via `from_user_id` or `to_user_id`. The two participants of a Conversation are equal peers; neither role nor pairing direction grants any special privileges.
- **From_User**: The Participant referenced by `conversations.from_user_id`. By convention this is the user who initiated the conversation, but the chat module treats `from_user_id` and `to_user_id` symmetrically for all read and write operations after creation.
- **To_User**: The Participant referenced by `conversations.to_user_id`. The other participant of the Conversation.
- **Other_Participant**: From the perspective of a given Authenticated_User who is a Participant of a Conversation, the other Participant of that Conversation (i.e., the participant whose id is `from_user_id` when the requester is `to_user_id`, or whose id is `to_user_id` when the requester is `from_user_id`).
- **Message**: A row in the `messages` table belonging to a Conversation, sent by a single Participant.
- **Attachment**: An image or video file uploaded via the Chat_API and referenced from a Message via the `messages.attachments` JSONB column.
- **Attachment_Descriptor**: A JSON object describing a single Attachment with the canonical shape `{ url, type, mime, size, thumbnailUrl?, width?, height?, durationMs? }`.
- **Conversation_Room**: The Socket.IO room named `conversation:{conversationId}` whose members are the sockets of Participants currently subscribed to that Conversation.
- **User_Room**: The Socket.IO room named `user:{userId}` whose members are all currently connected sockets belonging to that user. Used as a fallback delivery channel.
- **Server_Event**: A Socket.IO event emitted by the backend to one or more clients (server → client).
- **Client_Event**: A Socket.IO event emitted by a client and listened to by the backend (client → server).
- **Ack_Callback**: The optional Socket.IO acknowledgement callback supplied by the client when emitting a Client_Event, invoked by the backend with a structured response.
- **Last_Read_At**: A timestamp stored per Participant on a Conversation, marking the `created_at` of the most recent Message that Participant has read. Persisted in `conversations.from_last_read_at` for the participant referenced by `from_user_id`, and in `conversations.to_last_read_at` for the participant referenced by `to_user_id`.
- **Unread_Count**: The number of Messages in a Conversation whose `created_at` is strictly greater than the requesting Participant's Last_Read_At and whose `sender_id` is not the requesting Participant.
- **Keyset_Cursor**: An opaque string identifying a position in a Conversation's message stream, used by the messages-list endpoint for backward (older) pagination.
- **Conversation_List_Item**: The denormalised JSON shape returned by the conversations-list endpoint and the `chat:conversation-updated` event, containing the Conversation, the Other_Participant (from the requester's perspective), the last Message preview, and the requester's Unread_Count.
- **Message_Payload**: The canonical JSON shape of a Message returned by REST endpoints and emitted through the `chat:message` Socket.IO event.

## Requirements

### Requirement 1: List Conversations

**User Story:** As an Authenticated_User, I want to list every Conversation I am a Participant of, ordered by most recent activity, so that I can see all my chats on the chat list screen.

#### Acceptance Criteria

1. THE Chat_API SHALL accept HTTP `GET` requests at the path `/api/v1/chat/conversations`.
2. IF the request does not include a valid bearer token for an Authenticated_User, THEN THE Chat_API SHALL respond with HTTP status `401`.
3. WHEN an Authenticated_User requests `GET /api/v1/chat/conversations`, THE Chat_API SHALL return every Conversation where `from_user_id` or `to_user_id` equals that user's identifier and where `status` is not `'deleted'`.
4. THE Chat_API SHALL order the returned Conversations by `conversations.updated_at` descending and then by `conversations.id` descending.
5. THE Chat_API SHALL accept query parameters `page` (integer ≥ 1, default 1) and `limit` (integer between 1 and 100, default 20) parsed by the existing `parsePaginationQuery` utility, and SHALL return the result through `ApiResponse.paginated`.
6. THE Chat_API SHALL accept an optional query parameter `search` of type string with maximum length 100 and, when provided, SHALL filter Conversations to those whose Other_Participant's `users.name` contains the search value case-insensitively.
7. THE Chat_API SHALL return each Conversation as a Conversation_List_Item containing the keys `id`, `otherParticipant`, `lastMessage`, `lastMessageAt`, `unreadCount`, `createdAt`, and `updatedAt`.
8. THE Chat_API SHALL populate `otherParticipant` with the keys `id`, `name`, `avatar`, and `role` taken from the `users` row of the participant whose id is not the requesting user's id. The `role` value is included as informational metadata only and does not affect any chat-module behaviour.
9. THE Chat_API SHALL populate `lastMessage` with the keys `id`, `content`, `type`, `attachmentCount`, `senderId`, and `createdAt` taken from the Message referenced by `conversations.last_message_id`, or with `null` when the Conversation has no Messages.
10. THE Chat_API SHALL populate `lastMessageAt` with the `created_at` of the Message referenced by `conversations.last_message_id`, or with `conversations.created_at` when no last Message exists.
11. THE Chat_API SHALL populate `unreadCount` with the requesting Authenticated_User's Unread_Count for that Conversation.
12. THE Chat_Repository SHALL retrieve the Conversation list, the Other_Participant, the last Message, and each Conversation's Unread_Count using a single batched query strategy that does not issue per-row N+1 queries against `messages` or `users`.

### Requirement 2: Get Single Conversation

**User Story:** As an Authenticated_User, I want to fetch a single Conversation by id, so that the chat window can render the header even before the first message page has loaded.

#### Acceptance Criteria

1. THE Chat_API SHALL accept HTTP `GET` requests at the path `/api/v1/chat/conversations/:conversationId`.
2. THE Chat_API SHALL validate that the `conversationId` path parameter is a syntactically valid UUID v4.
3. IF the Conversation referenced by `conversationId` does not exist, THEN THE Chat_API SHALL respond with HTTP status `404`.
4. IF the requesting Authenticated_User is neither the `from_user_id` nor the `to_user_id` of the Conversation, THEN THE Chat_API SHALL respond with HTTP status `403`.
5. WHEN the request is authorised, THE Chat_API SHALL respond with HTTP status `200` and a body whose `data` field is a Conversation_List_Item with the same shape defined in Requirement 1.

### Requirement 3: Create or Get Conversation

**User Story:** As an Authenticated_User, I want to start a Conversation with another user without worrying whether one already exists, so that opening a chat from another user's profile is idempotent.

#### Acceptance Criteria

1. THE Chat_API SHALL accept HTTP `POST` requests at the path `/api/v1/chat/conversations` with a JSON body containing the field `otherUserId` of type UUID.
2. IF the request body is missing `otherUserId` or `otherUserId` is not a syntactically valid UUID, THEN THE Chat_API SHALL respond with HTTP status `400`.
3. IF `otherUserId` equals the requesting Authenticated_User's identifier, THEN THE Chat_API SHALL respond with HTTP status `400` and an error message stating that a user cannot chat with themself.
4. IF the `users` row referenced by `otherUserId` does not exist or has `status` set to `'deleted'`, THEN THE Chat_API SHALL respond with HTTP status `404`.
5. IF the requesting Authenticated_User and the user referenced by `otherUserId` are not exactly two distinct users, THEN THE Chat_API SHALL respond with HTTP status `400`. (Self-pairing is already covered by R3.3 which stays unchanged.)
6. WHEN a Conversation already exists with `(from_user_id, to_user_id)` matching the canonical-ordered pair of the two users, THE Chat_API SHALL return that existing Conversation with HTTP status `200`.
7. WHEN no Conversation exists, THE Chat_Service SHALL insert a new Conversation row with `from_user_id` set to the lesser of the two user UUIDs and `to_user_id` set to the greater (lexicographic UUID order), `status` set to `'active'`, and SHALL return the newly created Conversation with HTTP status `201`. The `from`/`to` ordering is enforced for storage uniqueness only and does not affect read or write semantics.
8. THE Chat_API SHALL return the created or existing Conversation as a Conversation_List_Item with the same shape defined in Requirement 1.
9. THE Chat_Repository SHALL rely on the unique index `unique_from_to_conversation` on `(from_user_id, to_user_id)` together with the database-level CHECK constraint `from_user_id < to_user_id` to prevent duplicate Conversations under concurrent insert attempts. On a unique-constraint violation, THE Chat_Repository SHALL retry once by re-reading the canonical-ordered pair with `WHERE from_user_id = :lo AND to_user_id = :hi`.

### Requirement 4: List Messages With Keyset Pagination

**User Story:** As an Authenticated_User, I want to load the most recent 100 messages of a Conversation and page backwards through older messages as I scroll up, so that long chats remain performant.

#### Acceptance Criteria

1. THE Chat_API SHALL accept HTTP `GET` requests at the path `/api/v1/chat/conversations/:conversationId/messages`.
2. IF the requesting Authenticated_User is not a Participant of the Conversation, THEN THE Chat_API SHALL respond with HTTP status `403`.
3. THE Chat_API SHALL accept the optional query parameter `limit` of type integer with minimum 1, maximum 100, and default 100.
4. THE Chat_API SHALL accept the optional query parameter `before` of type UUID, interpreted as a Keyset_Cursor referring to a Message id.
5. WHEN the `before` parameter is omitted, THE Chat_API SHALL return the most recent `limit` Messages of the Conversation ordered by `created_at` descending and then by `id` descending.
6. WHEN the `before` parameter is provided, THE Chat_API SHALL return the most recent `limit` Messages of the Conversation whose `(created_at, id)` is strictly less than the `(created_at, id)` of the Message referenced by the `before` cursor, ordered by `created_at` descending and then by `id` descending.
7. IF the `before` parameter references a Message that does not exist or does not belong to the Conversation, THEN THE Chat_API SHALL respond with HTTP status `400`.
8. THE Chat_API SHALL exclude Messages with `is_deleted = true` from the returned list and SHALL count excluded Messages toward neither the page size nor the cursor.
9. THE Chat_API SHALL return each Message as a Message_Payload containing the keys `id`, `conversationId`, `sender`, `content`, `type`, `attachments`, `status`, `createdAt`, and `updatedAt`.
10. THE Chat_API SHALL populate `sender` with the keys `id`, `name`, and `avatar` taken from the `users` row identified by `messages.sender_id`.
11. THE Chat_API SHALL populate `attachments` with an array of Attachment_Descriptor objects parsed from `messages.attachments` and SHALL return an empty array when `messages.attachments` is `null` or absent.
12. THE Chat_API SHALL include in the response body a `meta` object containing `limit`, `count` (the number of Messages returned), `hasMore` (a boolean true when the Conversation contains at least one additional older Message), and `nextBefore` (the `id` of the oldest Message in the returned page, or `null` when `hasMore` is false).

### Requirement 5: Send Message via REST

**User Story:** As an Authenticated_User, I want a REST endpoint to send a message that also triggers real-time delivery, so that other devices of mine and of the recipient receive it without re-emitting from the client.

#### Acceptance Criteria

1. THE Chat_API SHALL accept HTTP `POST` requests at the path `/api/v1/chat/messages` with a JSON body containing the optional fields `conversationId` (UUID), `recipientId` (UUID), `content` (string up to 5000 characters after trimming), `type` (string), `attachments` (array of Attachment_Descriptor), and `clientMessageId` (string up to 64 characters).
2. IF the request body provides neither `conversationId` nor `recipientId`, THEN THE Chat_API SHALL respond with HTTP status `400`.
3. IF the request body provides both `conversationId` and `recipientId` and the `recipientId` does not match the Other_Participant of the referenced Conversation, THEN THE Chat_API SHALL respond with HTTP status `400`.
4. WHEN only `recipientId` is provided, THE Chat_Service SHALL apply the create-or-get behaviour defined in Requirement 3 to resolve a Conversation between the requesting Authenticated_User and the recipient before persisting the Message.
5. IF the resolved Conversation cannot be found or the requesting Authenticated_User is not a Participant, THEN THE Chat_API SHALL respond with HTTP status `403`.
6. THE Chat_API SHALL accept `type` values from the set `'text'`, `'image'`, `'video'`, and `'mixed'` and SHALL default `type` to `'text'` when the field is omitted.
7. IF the request includes neither a non-empty `content` (after trimming) nor a non-empty `attachments` array, THEN THE Chat_API SHALL respond with HTTP status `400`.
8. IF `type` is `'image'` or `'video'` or `'mixed'` and `attachments` is empty, THEN THE Chat_API SHALL respond with HTTP status `400`.
9. IF `attachments` is non-empty and `type` is `'text'`, THEN THE Chat_Service SHALL set the persisted `messages.type` to `'image'`, `'video'`, or `'mixed'` based on the Attachment_Descriptor `type` values present, and SHALL persist the value the client supplied verbatim only when it is consistent with the supplied attachments.
10. THE Chat_Service SHALL persist the Message with `sender_id` set to the requesting Authenticated_User's id, the resolved `conversationId`, the supplied `content` (or empty string when only attachments are provided), the resolved `type`, the supplied `attachments`, and `status` set to `'sent'`.
11. THE Chat_Service SHALL update the parent Conversation's `last_message_id` and `updated_at` atomically with the Message insert inside a single database transaction.
12. THE Chat_API SHALL respond with HTTP status `201` and a `data` body containing the persisted Message_Payload, a `conversationId` field, and the `clientMessageId` echoed back when supplied.
13. WHEN the Message has been persisted, THE Chat_Service SHALL emit a `chat:message` Server_Event to the Conversation_Room and SHALL additionally emit a `chat:message` Server_Event to the User_Room of the Other_Participant.
14. WHEN the Message has been persisted, THE Chat_Service SHALL emit a `chat:conversation-updated` Server_Event to the User_Room of each Participant containing the updated Conversation_List_Item from each Participant's perspective.
15. THE Chat_API SHALL enforce a per-Authenticated_User rate limit of 60 send-message operations across REST and Socket.IO combined per rolling 60-second window, and SHALL respond with HTTP status `429` when the limit is exceeded.

### Requirement 6: Upload Chat Attachments

**User Story:** As an Authenticated_User, I want to upload one or more images or videos and receive Attachment_Descriptor objects, so that I can attach them to a subsequent send-message call.

#### Acceptance Criteria

1. THE Chat_API SHALL accept HTTP `POST` requests at the path `/api/v1/chat/messages/upload` with `multipart/form-data` content and a single repeating field named `files`.
2. THE Chat_API SHALL accept between 1 and 5 files per request and SHALL respond with HTTP status `400` when the request contains zero files or more than 5 files.
3. THE Chat_API SHALL accept the image MIME types `image/jpeg`, `image/png`, `image/webp`, and `image/gif`.
4. THE Chat_API SHALL accept the video MIME types `video/mp4`, `video/quicktime`, and `video/webm`.
5. IF a submitted file's MIME type is not in the accepted image or video sets, THEN THE Chat_API SHALL respond with HTTP status `400` without persisting the file to disk.
6. THE Chat_API SHALL enforce a per-file size limit of 10 megabytes for images and 50 megabytes for videos and SHALL respond with HTTP status `413` when any file exceeds its limit.
7. THE Chat_API SHALL store accepted files on the local filesystem under `public/chat-attachments/` using a unique filename of the form `{timestamp}-{random}{ext}` and SHALL serve them at the URL prefix `/public/chat-attachments/` via the existing static-file middleware.
8. THE Chat_API SHALL respond with HTTP status `201` and a body whose `data` field is an array of Attachment_Descriptor objects in the same order as the submitted files.
9. THE Chat_API SHALL populate each Attachment_Descriptor with `url` (the public URL path), `type` (`'image'` or `'video'`), `mime` (the original MIME type), and `size` (the file size in bytes).
10. WHERE the client supplies multipart fields named `width`, `height`, `durationMs`, or `thumbnailUrl` paired with a file by index, THE Chat_API SHALL include the supplied value in the corresponding Attachment_Descriptor when the value is syntactically valid.
11. THE Chat_API SHALL not perform server-side video thumbnail extraction in this iteration; thumbnail generation is explicitly out of scope and the `thumbnailUrl` field is populated only when supplied by the client.
12. THE Chat_API SHALL enforce a per-Authenticated_User rate limit of 30 upload requests per rolling 60-second window and SHALL respond with HTTP status `429` when the limit is exceeded.
13. IF the request does not include a valid bearer token for an Authenticated_User, THEN THE Chat_API SHALL respond with HTTP status `401` without writing any file to disk.

### Requirement 7: Mark Conversation Read

**User Story:** As an Authenticated_User, I want to mark messages as read up to a specific point, so that the green-dot unread indicator clears for me and the other participant sees my read receipt.

#### Acceptance Criteria

1. THE Chat_API SHALL accept HTTP `POST` requests at the path `/api/v1/chat/conversations/:conversationId/read` with a JSON body containing the optional field `lastReadMessageId` (UUID).
2. IF the requesting Authenticated_User is not a Participant of the Conversation, THEN THE Chat_API SHALL respond with HTTP status `403`.
3. WHEN `lastReadMessageId` is provided and references a Message belonging to the Conversation, THE Chat_Service SHALL set the requesting Participant's Last_Read_At to the `created_at` of that Message.
4. WHEN `lastReadMessageId` is omitted, THE Chat_Service SHALL set the requesting Participant's Last_Read_At to the `created_at` of the most recent Message in the Conversation, or to the current server time when the Conversation has no Messages.
5. IF `lastReadMessageId` references a Message that does not belong to the Conversation, THEN THE Chat_API SHALL respond with HTTP status `400`.
6. THE Chat_Service SHALL persist Last_Read_At in the column `from_last_read_at` when the requester's id equals `from_user_id` and in `to_last_read_at` when the requester's id equals `to_user_id`.
7. THE Chat_Service SHALL never decrease an existing Last_Read_At value; if the resolved Last_Read_At is earlier than the persisted value, THE Chat_Service SHALL leave the persisted value unchanged.
8. WHEN Last_Read_At has been updated, THE Chat_Service SHALL emit a `chat:read` Server_Event to the Conversation_Room with payload fields `conversationId`, `userId`, `lastReadMessageId`, and `lastReadAt`.
9. WHEN Last_Read_At has been updated, THE Chat_Service SHALL emit a `chat:conversation-updated` Server_Event to the User_Room of the requesting Authenticated_User containing the requester's freshly recomputed Conversation_List_Item with `unreadCount` set to zero.
10. THE Chat_API SHALL respond with HTTP status `200` and a body whose `data` field contains `conversationId`, `lastReadAt`, and `unreadCount` for the requesting Authenticated_User.

### Requirement 8: Socket Connection And Auto-Subscribe

**User Story:** As an Authenticated_User connecting from a mobile client, I want the backend to authenticate my socket and automatically subscribe me to all of my conversations, so that I receive new messages without explicit join calls per chat.

#### Acceptance Criteria

1. THE Chat_Socket_Handler SHALL rely on the existing `socketAuthMiddleware` for JWT verification and SHALL read the connected user's identifier from `socket.user.userId`.
2. WHEN a socket connection is established, THE Chat_Socket_Handler SHALL ensure the socket is joined to the User_Room `user:{userId}`.
3. WHEN a socket connection is established, THE Chat_Socket_Handler SHALL load every Conversation where the connected user is a Participant and SHALL join the socket to each corresponding Conversation_Room `conversation:{conversationId}`.
4. THE Chat_Socket_Handler SHALL continue to support explicit `chat:join` and `chat:leave` Client_Events as defined in Requirement 9 even after auto-subscription.
5. THE Chat_Socket_Handler SHALL not block the socket `connection` event on the auto-subscribe query; if the query fails, THE Chat_Socket_Handler SHALL log the error at level `error` and SHALL emit an `error` Server_Event to the connecting socket with code `CHAT_AUTOSUBSCRIBE_FAILED`.
6. WHEN a socket disconnects, THE Chat_Socket_Handler SHALL rely on Socket.IO's default behaviour to remove the socket from all rooms and SHALL not perform additional cleanup.

### Requirement 9: Client-To-Server Socket Events

**User Story:** As a mobile client developer, I want every chat-related event the backend listens for to have a fully specified payload, validation rules, and acknowledgement contract, so that I can build the mobile chat without guessing.

#### Acceptance Criteria

1. THE Chat_Socket_Handler SHALL listen for the Client_Event `chat:join` with payload `{ conversationId: string }` and SHALL validate that `conversationId` is a syntactically valid UUID belonging to a Conversation of which the connected user is a Participant.
2. WHEN a valid `chat:join` Client_Event is received, THE Chat_Socket_Handler SHALL join the emitting socket to the corresponding Conversation_Room.
3. IF a `chat:join` payload fails validation or refers to a Conversation the connected user is not a Participant of, THEN THE Chat_Socket_Handler SHALL emit an `error` Server_Event to the emitting socket with code `CHAT_JOIN_FORBIDDEN` and SHALL not modify room membership.
4. THE Chat_Socket_Handler SHALL listen for the Client_Event `chat:leave` with payload `{ conversationId: string }` and SHALL remove the emitting socket from the corresponding Conversation_Room when the payload is valid.
5. THE Chat_Socket_Handler SHALL listen for the Client_Event `chat:send-message` with payload `{ conversationId?: string, recipientId?: string, content?: string, type?: string, attachments?: Attachment_Descriptor[], clientMessageId?: string }` and an optional Ack_Callback.
6. THE Chat_Socket_Handler SHALL validate `chat:send-message` payloads using the same rules defined in Requirement 5 and SHALL persist the Message through the same Chat_Service code path as the REST endpoint.
7. WHEN a `chat:send-message` Client_Event has been processed successfully, THE Chat_Socket_Handler SHALL invoke the Ack_Callback with `{ success: true, message: Message_Payload, clientMessageId?: string }`.
8. IF a `chat:send-message` Client_Event fails validation, authorisation, or persistence, THEN THE Chat_Socket_Handler SHALL invoke the Ack_Callback with `{ success: false, error: { code, message } }` and SHALL not emit `chat:message`.
9. THE Chat_Socket_Handler SHALL listen for the Client_Event `chat:typing` with payload `{ conversationId: string }` and, when valid, SHALL broadcast a `chat:typing` Server_Event to the Conversation_Room excluding the emitting socket.
10. THE Chat_Socket_Handler SHALL listen for the Client_Event `chat:stop-typing` with payload `{ conversationId: string }` and, when valid, SHALL broadcast a `chat:stop-typing` Server_Event to the Conversation_Room excluding the emitting socket.
11. THE Chat_Socket_Handler SHALL throttle inbound `chat:typing` and `chat:stop-typing` Client_Events from a single socket to at most 5 events per second and SHALL silently drop additional events within the same window.
12. THE Chat_Socket_Handler SHALL listen for the Client_Event `chat:mark-read` with payload `{ conversationId: string, lastReadMessageId?: string }` and SHALL apply the same logic as Requirement 7.
13. THE Chat_Socket_Handler SHALL enforce the combined per-Authenticated_User rate limit defined in Requirement 5 across `chat:send-message` Client_Events received over Socket.IO and SHALL invoke the Ack_Callback with `{ success: false, error: { code: 'CHAT_RATE_LIMITED', message } }` when the limit is exceeded.
14. IF a Client_Event payload exceeds 64 kilobytes when serialised to JSON, THEN THE Chat_Socket_Handler SHALL invoke the Ack_Callback with `{ success: false, error: { code: 'CHAT_PAYLOAD_TOO_LARGE', message } }` when the event has an Ack_Callback, and SHALL otherwise emit an `error` Server_Event to the emitting socket.

### Requirement 10: Server-To-Client Socket Events

**User Story:** As a mobile client developer, I want every chat-related event the backend emits to have a fully specified payload and target audience, so that I can build conversation list updates, message bubbles, typing indicators, and read receipts deterministically.

#### Acceptance Criteria

1. THE Chat_Socket_Handler SHALL emit the Server_Event `chat:message` to the Conversation_Room and to the User_Room of the recipient whenever a Message is persisted, with the full Message_Payload defined in Requirement 4 plus a `conversationId` field and an optional `clientMessageId` field echoed from the originating Client_Event.
2. THE Chat_Socket_Handler SHALL emit the Server_Event `chat:typing` to the Conversation_Room (excluding the originator) with payload `{ conversationId, userId, name }` whenever a `chat:typing` Client_Event is processed.
3. THE Chat_Socket_Handler SHALL emit the Server_Event `chat:stop-typing` to the Conversation_Room (excluding the originator) with payload `{ conversationId, userId, name }` whenever a `chat:stop-typing` Client_Event is processed.
4. THE Chat_Socket_Handler SHALL emit the Server_Event `chat:read` to the Conversation_Room with payload `{ conversationId, userId, lastReadMessageId, lastReadAt }` whenever a `chat:mark-read` Client_Event or the REST mark-read endpoint successfully updates Last_Read_At.
5. THE Chat_Socket_Handler SHALL emit the Server_Event `chat:online-status` to all connected sockets with payload `{ userId, isOnline }` whenever a user's first socket connects (`isOnline: true`) or whenever the user's last socket disconnects (`isOnline: false`); this behaviour is already implemented in `src/socket/index.ts` and is documented here so the Chat_Socket_Handler does not duplicate it.
6. THE Chat_Socket_Handler SHALL emit the Server_Event `chat:conversation-updated` to the User_Room of each Participant whenever the Participant's Conversation_List_Item changes, with payload equal to that Participant's freshly recomputed Conversation_List_Item.
7. THE Chat_Socket_Handler SHALL trigger `chat:conversation-updated` at minimum after a Message is persisted, after Last_Read_At is updated, and after a Conversation is created via Requirement 3.
8. THE Chat_Socket_Handler SHALL emit the Server_Event `error` to a single emitting socket with payload `{ message: string, code?: string }` when a socket-level error occurs that is not represented by an Ack_Callback failure.
9. THE Chat_Socket_Handler SHALL ensure that every payload field declared in this requirement is serialisable to JSON without loss; `Date` values SHALL be encoded as ISO-8601 strings.

### Requirement 11: Database Schema Additions

**User Story:** As a backend developer, I want the schema to support per-participant unread tracking and efficient keyset pagination, so that the chat list and message list endpoints meet their performance contracts.

#### Acceptance Criteria

1. THE backend SHALL include a new Sequelize migration that (a) renames `conversations.customer_id` to `from_user_id` and `conversations.tradie_id` to `to_user_id`, (b) adds two columns to `conversations`: `from_last_read_at` of type `TIMESTAMP NULL` and `to_last_read_at` of type `TIMESTAMP NULL`, (c) replaces the existing unique index `unique_customer_tradie_conversation` with a new index `unique_from_to_conversation` on `(from_user_id, to_user_id)`, and (d) adds a CHECK constraint `from_user_id < to_user_id` so the canonical ordering is enforced at the database level.
2. THE migration SHALL not introduce a new join table for per-participant read state; the per-column approach is chosen over a `conversation_participants` table because Conversations are strictly 1:1 and the per-column representation eliminates one join from the conversation list query. The two columns `from_last_read_at` / `to_last_read_at` are role-agnostic — they correspond to the two participants of the conversation, not to any role.
3. THE migration SHALL ensure an index on `messages` covering the columns `(conversation_id, created_at DESC, id DESC)` exists; if the existing index `messages(conversation_id, created_at)` is not equivalent, THE migration SHALL add the descending composite index and SHALL keep or drop the older index based on whether it remains useful for any other query.
4. THE migration SHALL widen the `messages.type` column from `STRING(10)` to `STRING(20)` to give headroom for future message-type values; the strings `'text'`, `'image'`, `'video'`, and `'mixed'` already fit within `STRING(10)` and the widening is precautionary.
5. THE `Conversation` Sequelize model SHALL declare the attributes `fromUserId`, `toUserId`, `fromLastReadAt`, and `toLastReadAt`, mapped to the new columns, and SHALL include them in `IConversationAttributes` and `IConversationCreationAttributes`.
6. THE `Message` Sequelize model SHALL update the typing of the `attachments` attribute from `string[] | null` to `Attachment_Descriptor[] | null`. The `messages.sender_id` column (mapped to the `senderId` attribute) is unchanged: it correctly represents the "from" of an individual Message, and either Participant of a Conversation may be the sender.
7. THE migration SHALL provide a working `down` step that reverses every step in reverse order: restoring the `messages` ascending index, dropping the descending composite index, narrowing `messages.type` back to `STRING(10)`, dropping the simple indexes on `from_user_id` / `to_user_id` and restoring the simple indexes on `customer_id` / `tradie_id`, dropping the `from_user_id < to_user_id` CHECK constraint, dropping the unique index `unique_from_to_conversation` and restoring the original unique index `unique_customer_tradie_conversation`, dropping the new `to_last_read_at` and `from_last_read_at` columns, and renaming `from_user_id` back to `customer_id` and `to_user_id` back to `tradie_id`.
8. THE migration SHALL rename `conversations.customer_id` to `from_user_id` and `conversations.tradie_id` to `to_user_id`. The rename is data-preserving (no data rewrite) and reversible via the `down` step.
9. THE migration SHALL drop the existing unique index `unique_customer_tradie_conversation` and create a unique index `unique_from_to_conversation` on `(from_user_id, to_user_id)`. Pair uniqueness in either direction is achieved by combining this index with the CHECK constraint `from_user_id < to_user_id`, which guarantees that every Conversation is stored in canonical (lesser-uuid, greater-uuid) order.
10. THE migration SHALL drop the existing simple indexes `conversations(customer_id)` and `conversations(tradie_id)` and create the simple indexes `conversations(from_user_id)` and `conversations(to_user_id)` to match the renamed columns.

### Requirement 12: Attachment JSON Shape

**User Story:** As a mobile client developer, I want a single canonical shape for attachments stored in the database and emitted over the wire, so that the client can render images and videos without per-request type guessing.

#### Acceptance Criteria

1. THE Chat_Service SHALL persist `messages.attachments` as a JSON array of Attachment_Descriptor objects.
2. THE Attachment_Descriptor SHALL contain the required keys `url` (string), `type` (the literal string `'image'` or `'video'`), `mime` (string), and `size` (integer ≥ 0).
3. THE Attachment_Descriptor MAY contain the optional keys `thumbnailUrl` (string), `width` (integer ≥ 1), `height` (integer ≥ 1), and `durationMs` (integer ≥ 0).
4. THE Chat_Service SHALL reject persistence of any Attachment_Descriptor whose `type` value is not in the set `{ 'image', 'video' }`.
5. THE Chat_Service SHALL reject persistence of any Attachment_Descriptor whose `url` does not begin with the string `/public/chat-attachments/`.
6. THE Chat_API SHALL return Attachment_Descriptor objects in the same shape over both REST responses and Socket.IO `chat:message` events.
7. THE Chat_Service SHALL preserve the order of Attachment_Descriptor objects as supplied by the client.
8. THE Chat_Service SHALL cap the number of Attachment_Descriptor objects per Message at 5 and SHALL respond with HTTP status `400` when more are supplied.

### Requirement 13: Chat Attachment Upload Helper

**User Story:** As a backend developer, I want a reusable upload helper that accepts both images and videos for the chat module, so that the existing `createImageUpload` helper can stay narrowly scoped.

#### Acceptance Criteria

1. THE backend SHALL expose a new helper function `createChatAttachmentUpload` in `src/services/file-upload.service.ts` that returns a configured `multer` middleware.
2. THE `createChatAttachmentUpload` helper SHALL store uploaded files on disk under `public/chat-attachments/` using the same filename strategy as `createImageUpload`.
3. THE `createChatAttachmentUpload` helper SHALL accept the image MIME types declared in Requirement 6 and the video MIME types declared in Requirement 6.
4. THE `createChatAttachmentUpload` helper SHALL apply per-file size limits matching Requirement 6 by inspecting each file's MIME type before accepting it.
5. THE `createChatAttachmentUpload` helper SHALL configure `multer` with a `.array(fieldName, 5)` form, where `fieldName` defaults to `'files'`.
6. THE `createChatAttachmentUpload` helper SHALL not implement video transcoding, image resizing, or thumbnail generation in this iteration.

### Requirement 14: Module Layout And Conventions

**User Story:** As a backend developer, I want the chat module to follow the same file layout and middleware conventions used by `tradie`, `review`, and `category`, so that the codebase remains consistent.

#### Acceptance Criteria

1. THE backend SHALL implement the chat REST surface in the directory `src/modules/chat/` containing the files `chat.controller.ts`, `chat.service.ts`, `chat.repository.ts`, `chat.routes.ts`, `chat.validation.ts`, `chat.interface.ts`, `chat.swagger.ts`, and `index.ts`.
2. THE Chat_API routes SHALL apply the existing `authenticateUser` middleware to every endpoint defined by Requirements 1 through 7.
3. THE Chat_API routes SHALL use Joi schemas defined in `chat.validation.ts` together with the existing `validate` middleware for body, query, and params validation.
4. THE Chat_API SHALL use the existing `ApiResponse` utility for all success responses and the existing `asyncHandler` utility for controller methods.
5. THE Chat_API SHALL throw exceptions from `src/common/exceptions` (`BadRequestException`, `NotFoundException`, `ForbiddenException`, `UnauthorizedException`) so that the existing global error handler produces the standard error envelope.
6. THE Chat_API SHALL source human-readable success messages from a `CHAT_MESSAGES` constant in `src/common/constants/messages.ts`, extending the existing `CHAT_MESSAGES` object as needed without breaking existing keys.
7. THE Chat_API SHALL parse pagination query parameters using the existing `parsePaginationQuery` utility for endpoints that use offset pagination.
8. THE backend SHALL implement the chat Socket.IO surface in `src/socket/handlers/chat.handler.ts` and SHALL keep socket type declarations consistent with the updated `src/socket/socket.types.ts`.
9. THE Chat_Socket_Handler SHALL invoke the same Chat_Service methods used by the Chat_API rather than duplicating persistence or authorisation logic.

### Requirement 15: Authorisation Rules

**User Story:** As a platform operator, I want only the two Participants of a Conversation to be able to read its messages, send new messages, mark it read, or join its room, so that chats remain private.

#### Acceptance Criteria

1. THE Chat_Service SHALL treat any Authenticated_User who is neither `from_user_id` nor `to_user_id` of a Conversation as unauthorised for that Conversation.
2. WHEN an unauthorised Authenticated_User invokes a REST endpoint that targets a specific Conversation, THE Chat_API SHALL respond with HTTP status `403`.
3. WHEN an unauthorised Authenticated_User emits a Client_Event that targets a specific Conversation, THE Chat_Socket_Handler SHALL respond per Requirement 9 (Ack_Callback failure or `error` Server_Event) and SHALL NOT add the socket to the Conversation_Room.
4. THE Chat_Service SHALL not allow a sender to send a Message to a Conversation in which the sender is not a Participant, regardless of whether the request originates from REST or Socket.IO.
5. THE Chat_Service SHALL treat the existence of a `users.status` value of `'banned'`, `'suspended'`, or `'deleted'` on either Participant as a future authorisation hook; this iteration SHALL allow the message exchange to proceed for any non-`'deleted'` Participant, and SHALL document this in module-level comments so the hook can be tightened later.

### Requirement 16: Validation, Error Envelope, And Swagger Documentation

**User Story:** As a frontend developer, I want chat errors and Swagger docs to match the rest of the v1 API, so that I can reuse my existing client tooling.

#### Acceptance Criteria

1. WHEN the Chat_API returns any HTTP error response, THE Chat_API SHALL return a JSON body that conforms to the existing global error response envelope used by other v1 modules.
2. THE Chat_API SHALL define error codes for each error class it surfaces, at minimum `CHAT_VALIDATION_ERROR`, `CHAT_UNAUTHORIZED`, `CHAT_FORBIDDEN`, `CHAT_NOT_FOUND`, `CHAT_CONFLICT`, `CHAT_RATE_LIMITED`, `CHAT_PAYLOAD_TOO_LARGE`, `CHAT_UPLOAD_FAILED`, and `CHAT_AUTOSUBSCRIBE_FAILED`.
3. THE Chat_API SHALL include `@swagger` JSDoc annotations in `chat.swagger.ts` for every REST endpoint defined by Requirements 1 through 7, including request body, query, params, response shape, and error responses.
4. THE Chat_API SHALL document Socket.IO events in a dedicated section of `chat.swagger.ts` using a free-form description block, since Swagger does not natively model Socket.IO events.

### Requirement 17: Pagination And Query Performance

**User Story:** As a backend developer, I want chat queries to be efficient on long-running conversations and large user bases, so that latency does not degrade as data grows.

#### Acceptance Criteria

1. THE Chat_Repository SHALL implement message pagination using a keyset cursor on `(messages.created_at, messages.id)` and SHALL not use `OFFSET` for the messages-list endpoint.
2. THE Chat_Repository SHALL fetch the conversation list in a single SQL statement that joins `conversations`, the Other_Participant `users` row, and the last `messages` row, and SHALL not issue per-row follow-up queries.
3. THE Chat_Repository SHALL compute `unreadCount` for each row in the conversation list either as part of the same query (via a correlated subquery or aggregate) or via a single batched count query keyed by `conversation_id`, but SHALL NOT issue one count query per Conversation.
4. THE Chat_Repository SHALL update `conversations.last_message_id` and `conversations.updated_at` inside the same database transaction as the `messages` insert.
5. THE Chat_Service SHALL avoid loading the full Message body of older Messages when only the last-message preview is needed for the conversation list.

### Requirement 18: Real-Time Delivery Guarantees

**User Story:** As a mobile client developer, I want clear delivery semantics for chat events, so that my optimistic-UI reconciliation logic is correct.

#### Acceptance Criteria

1. THE Chat_Socket_Handler SHALL deliver `chat:message` Server_Events to every socket currently joined to the Conversation_Room and additionally to every socket currently joined to the User_Room of the Other_Participant.
2. THE Chat_Socket_Handler SHALL not retry or persist undelivered Socket.IO events; clients SHALL recover missed Messages on reconnect by calling `GET /api/v1/chat/conversations/:conversationId/messages`.
3. THE Chat_Socket_Handler SHALL echo back the originating `clientMessageId` in the `chat:message` Server_Event payload when the Message originated from a `chat:send-message` Client_Event or a REST `POST /messages` request that supplied `clientMessageId`.
4. THE Chat_Service SHALL assign a server-generated `id` (UUID) to every persisted Message and SHALL include this `id` in every emission of `chat:message`.
5. THE Chat_Socket_Handler SHALL emit `chat:message` to the User_Room of the sender as well as the Other_Participant, so that other devices of the sender stay in sync.

### Requirement 19: Rate Limiting And Payload Limits

**User Story:** As a platform operator, I want chat traffic to be rate-limited and bounded in size, so that a misbehaving or malicious client cannot overwhelm the backend.

#### Acceptance Criteria

1. THE Chat_API SHALL enforce a per-Authenticated_User rate limit of 60 send-message operations per rolling 60-second window across REST and Socket.IO combined and SHALL respond accordingly per Requirement 5 and Requirement 9.
2. THE Chat_API SHALL enforce a per-Authenticated_User rate limit of 30 attachment-upload operations per rolling 60-second window per Requirement 6.
3. THE Chat_Socket_Handler SHALL enforce a maximum inbound Socket.IO event payload size of 64 kilobytes per event.
4. THE Chat_API SHALL enforce a maximum HTTP request body size of 1 megabyte for JSON endpoints (excluding the `/messages/upload` endpoint, which is governed by Requirement 6).
5. THE Chat_Service SHALL enforce a maximum `messages.content` length of 5000 characters after trimming.
6. THE Chat_Service SHALL enforce a maximum of 5 Attachment_Descriptor objects per Message.

### Requirement 20: Out-Of-Scope Behaviours

**User Story:** As a stakeholder, I want explicit boundaries on what this feature does and does not deliver, so that follow-up work can be planned without ambiguity.

#### Acceptance Criteria

1. THE Chat_Module SHALL not implement group chat or multi-party conversations; every Conversation SHALL be a strict 1:1 between two distinct LocalLoom users.
2. THE Chat_Module SHALL not implement message editing or hard-deletion in this iteration; the existing `messages.is_deleted` soft-delete flag SHALL remain the only deletion mechanism and SHALL not be exposed through new REST or Socket.IO endpoints in this spec.
3. THE Chat_Module SHALL not implement end-to-end encryption.
4. THE Chat_Module SHALL not wire push notifications in this spec; the existing `notification:new` Socket.IO event and the existing notifications module SHALL remain the integration touch point, and the chat module SHALL document where push triggers would be added in a follow-up spec.
5. THE Chat_Module SHALL not produce mobile-side or admin-side developer documentation in this spec; that documentation SHALL be produced as a separate `.md` artefact in a follow-up phase.
6. THE Chat_Module SHALL not perform server-side video thumbnail extraction; the `thumbnailUrl` field on the Attachment_Descriptor SHALL be populated only when supplied by the client.
