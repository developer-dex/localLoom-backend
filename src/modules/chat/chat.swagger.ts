/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: |
 *     Real-time 1:1 messaging between any two distinct LocalLoom users.
 *     REST endpoints live under `/api/v1/chat`. Real-time delivery uses Socket.IO.
 *
 *     ## Socket.IO Events
 *
 *     ### Server-to-Client Events
 *
 *     | Event | Payload | Description |
 *     |-------|---------|-------------|
 *     | `chat:message` | `{ id, conversationId, sender: { id, name, avatar }, content, type, attachments, status, createdAt, updatedAt, clientMessageId? }` | New message delivered to conversation room and user rooms |
 *     | `chat:typing` | `{ conversationId, userId, name }` | Typing indicator broadcast to conversation room (excluding originator) |
 *     | `chat:stop-typing` | `{ conversationId, userId, name }` | Stop-typing broadcast to conversation room (excluding originator) |
 *     | `chat:read` | `{ conversationId, userId, lastReadMessageId, lastReadAt }` | Read receipt broadcast to conversation room |
 *     | `chat:online-status` | `{ userId, isOnline }` | Online presence broadcast to all connected sockets |
 *     | `chat:conversation-updated` | `{ conversation: ConversationListItem }` | Updated conversation list item sent to each participant's user room |
 *     | `error` | `{ code, message }` | Error event for non-ack scenarios (e.g. CHAT_AUTOSUBSCRIBE_FAILED, CHAT_JOIN_FORBIDDEN) |
 *
 *     ### Client-to-Server Events
 *
 *     | Event | Payload | Ack Response | Description |
 *     |-------|---------|--------------|-------------|
 *     | `chat:join` | `{ conversationId: string }` | — | Join a conversation room for real-time updates |
 *     | `chat:leave` | `{ conversationId: string }` | — | Leave a conversation room |
 *     | `chat:send-message` | `{ conversationId?, recipientId?, content?, type?, attachments?, clientMessageId? }` | `{ success: true, message: MessagePayload, clientMessageId? }` or `{ success: false, error: { code, message } }` | Send a message via socket (same validation as REST) |
 *     | `chat:typing` | `{ conversationId: string }` | — | Signal typing (throttled: max 5/s per socket) |
 *     | `chat:stop-typing` | `{ conversationId: string }` | — | Signal stop typing |
 *     | `chat:mark-read` | `{ conversationId: string, lastReadMessageId?: string }` | `{ success: true, conversationId, lastReadAt, unreadCount }` or `{ success: false, error: { code, message } }` | Mark messages as read |
 *
 *     ### Ack Error Codes
 *
 *     | Code | HTTP Equivalent | Description |
 *     |------|-----------------|-------------|
 *     | `CHAT_VALIDATION_ERROR` | 400 | Payload failed validation |
 *     | `CHAT_UNAUTHORIZED` | 401 | Authentication required |
 *     | `CHAT_FORBIDDEN` | 403 | Not a participant |
 *     | `CHAT_NOT_FOUND` | 404 | Conversation/message not found |
 *     | `CHAT_RATE_LIMITED` | 429 | Rate limit exceeded |
 *     | `CHAT_PAYLOAD_TOO_LARGE` | 413 | Payload exceeds 64KB |
 *     | `CHAT_JOIN_FORBIDDEN` | 403 | Cannot join conversation room |
 */

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     summary: List conversations
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns all conversations where the authenticated user is a participant,
 *       ordered by most recent activity. Supports pagination and name search.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by other participant's name (case-insensitive)
 *     responses:
 *       200:
 *         description: Conversations fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Conversations fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ConversationListItem'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /chat/conversations/{conversationId}:
 *   get:
 *     summary: Get a single conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     description: Fetch a single conversation by ID. The requester must be a participant.
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation UUID
 *     responses:
 *       200:
 *         description: Conversation fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Conversation fetched successfully
 *                 data:
 *                   $ref: '#/components/schemas/ConversationListItem'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Not a participant of this conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: Not a participant of this conversation
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_FORBIDDEN
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Conversation not found
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_NOT_FOUND
 */

/**
 * @swagger
 * /chat/conversations:
 *   post:
 *     summary: Create or get a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Creates a new conversation with the specified user, or returns the existing one
 *       if a conversation already exists between the two users. Idempotent.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otherUserId
 *             properties:
 *               otherUserId:
 *                 type: string
 *                 format: uuid
 *                 description: The UUID of the other user to chat with
 *     responses:
 *       200:
 *         description: Existing conversation returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Conversation fetched successfully
 *                 data:
 *                   $ref: '#/components/schemas/ConversationListItem'
 *       201:
 *         description: New conversation created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Conversation created successfully
 *                 data:
 *                   $ref: '#/components/schemas/ConversationListItem'
 *       400:
 *         description: Validation error (missing otherUserId, self-conversation, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: Cannot create a conversation with yourself
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_VALIDATION_ERROR
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Other user not found or deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Other user not found or has been deleted
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_NOT_FOUND
 */


/**
 * @swagger
 * /chat/conversations/{conversationId}/messages:
 *   get:
 *     summary: List messages in a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns messages in a conversation using keyset (cursor-based) pagination.
 *       Messages are ordered by most recent first. Use the `before` parameter to
 *       page backwards through older messages.
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation UUID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 100
 *         description: Number of messages to return
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Keyset cursor — message ID to paginate before (older messages)
 *     responses:
 *       200:
 *         description: Messages fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Messages fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MessagePayload'
 *                     meta:
 *                       type: object
 *                       properties:
 *                         limit:
 *                           type: integer
 *                           example: 100
 *                         count:
 *                           type: integer
 *                           example: 50
 *                         hasMore:
 *                           type: boolean
 *                           example: true
 *                         nextBefore:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                           description: ID of the oldest message in the page, or null if no more
 *       400:
 *         description: Invalid cursor (message not found in conversation)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: Cursor message not found in this conversation
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_VALIDATION_ERROR
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Not a participant of this conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: Not a participant of this conversation
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_FORBIDDEN
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Conversation not found
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_NOT_FOUND
 */

/**
 * @swagger
 * /chat/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Send a message to a conversation. Provide either `conversationId` or `recipientId`
 *       (or both). When only `recipientId` is provided, the conversation is created if it
 *       does not exist. Triggers real-time delivery via Socket.IO.
 *
 *       Rate limited: 60 messages per user per 60-second rolling window (shared with Socket.IO).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 format: uuid
 *                 description: Target conversation (optional if recipientId provided)
 *               recipientId:
 *                 type: string
 *                 format: uuid
 *                 description: Recipient user ID (optional if conversationId provided)
 *               content:
 *                 type: string
 *                 maxLength: 5000
 *                 description: Message text content
 *               type:
 *                 type: string
 *                 enum: [text, image, video, mixed]
 *                 description: Message type (auto-resolved from attachments if omitted)
 *               attachments:
 *                 type: array
 *                 maxItems: 5
 *                 items:
 *                   $ref: '#/components/schemas/AttachmentDescriptor'
 *                 description: Array of attachment descriptors
 *               clientMessageId:
 *                 type: string
 *                 maxLength: 64
 *                 description: Client-generated ID for deduplication/correlation
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Message sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/MessagePayload'
 *                     conversationId:
 *                       type: string
 *                       format: uuid
 *                     clientMessageId:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Validation error (missing content/attachments, invalid type, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: content or attachments required
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_VALIDATION_ERROR
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Not a participant of the conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: Not a participant of this conversation
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_FORBIDDEN
 *       404:
 *         description: Conversation or recipient not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Conversation not found
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_NOT_FOUND
 *       429:
 *         description: Rate limit exceeded (60 messages per 60s)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 429
 *                 message:
 *                   type: string
 *                   example: Too many chat requests
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_RATE_LIMITED
 */

/**
 * @swagger
 * /chat/messages/upload:
 *   post:
 *     summary: Upload chat attachments
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Upload 1–5 image or video files. Returns an array of Attachment_Descriptor objects
 *       that can be included in a subsequent send-message call.
 *
 *       Accepted image types: image/jpeg, image/png, image/webp, image/gif (max 10MB each).
 *       Accepted video types: video/mp4, video/quicktime, video/webm (max 50MB each).
 *
 *       Rate limited: 30 uploads per user per 60-second rolling window.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 minItems: 1
 *                 maxItems: 5
 *                 description: Image or video files to upload
 *               width[0]:
 *                 type: integer
 *                 description: Width of file at index 0 (optional paired metadata)
 *               height[0]:
 *                 type: integer
 *                 description: Height of file at index 0 (optional paired metadata)
 *               durationMs[0]:
 *                 type: integer
 *                 description: Duration in ms for video at index 0 (optional)
 *               thumbnailUrl[0]:
 *                 type: string
 *                 description: Client-supplied thumbnail URL for file at index 0 (optional)
 *     responses:
 *       201:
 *         description: Attachments uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: Attachments uploaded successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AttachmentDescriptor'
 *       400:
 *         description: No files provided, invalid MIME type, or more than 5 files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: At least one file is required
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_PAYLOAD_TOO_LARGE
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       413:
 *         description: File exceeds size limit (10MB images, 50MB videos)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 413
 *                 message:
 *                   type: string
 *                   example: File photo.jpg exceeds the size limit for its type
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_PAYLOAD_TOO_LARGE
 *       429:
 *         description: Upload rate limit exceeded (30 per 60s)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 429
 *                 message:
 *                   type: string
 *                   example: Too many upload requests
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_RATE_LIMITED
 */

/**
 * @swagger
 * /chat/conversations/{conversationId}/read:
 *   post:
 *     summary: Mark conversation as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Marks messages as read up to a specific point. If `lastReadMessageId` is provided,
 *       marks up to that message. If omitted, marks up to the most recent message.
 *       The read timestamp never decreases (monotonically non-decreasing).
 *       Triggers a `chat:read` event to the conversation room.
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation UUID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lastReadMessageId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the message to mark as read up to (optional)
 *     responses:
 *       200:
 *         description: Messages marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Messages marked as read
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversationId:
 *                       type: string
 *                       format: uuid
 *                     lastReadAt:
 *                       type: string
 *                       format: date-time
 *                     unreadCount:
 *                       type: integer
 *                       example: 0
 *       400:
 *         description: lastReadMessageId does not belong to this conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: lastReadMessageId not found in this conversation
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_VALIDATION_ERROR
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Not a participant of this conversation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: Not a participant of this conversation
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_FORBIDDEN
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Conversation not found
 *                 errors:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: CHAT_NOT_FOUND
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ConversationListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         otherParticipant:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             avatar:
 *               type: string
 *               nullable: true
 *             role:
 *               type: string
 *               description: Informational only — not used for authorization
 *         lastMessage:
 *           nullable: true
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             content:
 *               type: string
 *             type:
 *               type: string
 *             attachmentCount:
 *               type: integer
 *             senderId:
 *               type: string
 *               format: uuid
 *             createdAt:
 *               type: string
 *               format: date-time
 *         lastMessageAt:
 *           type: string
 *           format: date-time
 *         unreadCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     MessagePayload:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         conversationId:
 *           type: string
 *           format: uuid
 *         sender:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             avatar:
 *               type: string
 *               nullable: true
 *         content:
 *           type: string
 *         type:
 *           type: string
 *           enum: [text, image, video, mixed]
 *         attachments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AttachmentDescriptor'
 *         status:
 *           type: string
 *           example: sent
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         clientMessageId:
 *           type: string
 *           nullable: true
 *     AttachmentDescriptor:
 *       type: object
 *       required:
 *         - url
 *         - type
 *         - mime
 *         - size
 *       properties:
 *         url:
 *           type: string
 *           description: Public URL path starting with /public/chat-attachments/
 *         type:
 *           type: string
 *           enum: [image, video]
 *         mime:
 *           type: string
 *           description: Original MIME type
 *         size:
 *           type: integer
 *           description: File size in bytes
 *         thumbnailUrl:
 *           type: string
 *           nullable: true
 *         width:
 *           type: integer
 *           nullable: true
 *         height:
 *           type: integer
 *           nullable: true
 *         durationMs:
 *           type: integer
 *           nullable: true
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         total:
 *           type: integer
 *         totalPages:
 *           type: integer
 *         hasNextPage:
 *           type: boolean
 *         hasPrevPage:
 *           type: boolean
 */
