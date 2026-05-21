# LocalLoom — Chat API Documentation
## Real-time Messaging (REST + Socket.IO)

> **Base URL:** `{{BASE_URL}}/api/v1/chat`
> All requests/responses are `application/json` unless noted as `multipart/form-data`.
> All responses follow the standard envelope shape.
> All endpoints require `Authorization: Bearer <accessToken>`.

---

## Table of Contents

1. [Response Envelope](#response-envelope)
2. [Error Codes](#error-codes)
3. [Rate Limits](#rate-limits)
4. [REST Endpoints](#rest-endpoints)
   - [GET /chat/conversations](#1-get-chatconversations)
   - [GET /chat/conversations/:conversationId](#2-get-chatconversationsconversationid)
   - [POST /chat/conversations](#3-post-chatconversations)
   - [GET /chat/conversations/:conversationId/messages](#4-get-chatconversationsconversationidmessages)
   - [POST /chat/messages](#5-post-chatmessages)
   - [POST /chat/messages/upload](#6-post-chatmessagesupload)
   - [POST /chat/conversations/:conversationId/read](#7-post-chatconversationsconversationidread)
5. [Socket.IO Events](#socketio-events)
   - [Client → Server Events](#client--server-events)
   - [Server → Client Events](#server--client-events)
6. [Data Types](#data-types)

---

## Response Envelope

Success:
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... }
}
```

Paginated:
```json
{
  "success": true,
  "message": "...",
  "data": [ ... ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

Error:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["field-level detail (optional)"]
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `CHAT_VALIDATION_ERROR` | 400 | Invalid request body or parameters |
| `CHAT_UNAUTHORIZED` | 401 | Authentication required or token invalid |
| `CHAT_FORBIDDEN` | 403 | User is not a participant of the conversation |
| `CHAT_NOT_FOUND` | 404 | Conversation or message not found |
| `CHAT_CONFLICT` | 409 | Resource conflict (e.g. duplicate conversation) |
| `CHAT_RATE_LIMITED` | 429 | Too many requests — sliding window exceeded |
| `CHAT_PAYLOAD_TOO_LARGE` | 413 | File or payload exceeds size limit |
| `CHAT_UPLOAD_FAILED` | 400 | Attachment upload failed |
| `CHAT_AUTOSUBSCRIBE_FAILED` | — | Socket auto-subscribe to rooms failed (emitted via `error` event) |
| `CHAT_JOIN_FORBIDDEN` | — | Socket `chat:join` denied (emitted via `error` event) |

---

## Rate Limits

| Action | Limit | Window |
|--------|-------|--------|
| Send message (REST + Socket) | 60 requests | 60 seconds |
| Upload attachments | 30 requests | 60 seconds |
| Typing events (per socket) | 5 events/second | Token bucket |

Rate-limited responses return HTTP `429` with:
```json
{
  "success": false,
  "message": "Too many chat requests",
  "errors": []
}
```

---

## REST Endpoints

---

### 1. GET /chat/conversations

List conversations for the authenticated user, ordered by most recent activity.

#### Query Parameters

| Param | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `page` | integer | ❌ | 1 | min 1 | Page number |
| `limit` | integer | ❌ | 20 | 1–100 | Items per page |
| `search` | string | ❌ | — | max 100 chars | Filter by other participant's name (ILIKE) |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Conversations fetched successfully",
  "data": [
    {
      "id": "conv-uuid",
      "otherParticipant": {
        "id": "user-uuid",
        "name": "Jane Smith",
        "avatar": "/uploads/profile/photo.jpg",
        "role": "customer"
      },
      "lastMessage": {
        "id": "msg-uuid",
        "content": "Hey, are you available tomorrow?",
        "type": "text",
        "attachmentCount": 0,
        "senderId": "user-uuid",
        "createdAt": "2026-05-20T14:30:00.000Z"
      },
      "lastMessageAt": "2026-05-20T14:30:00.000Z",
      "unreadCount": 3,
      "createdAt": "2026-05-18T09:00:00.000Z",
      "updatedAt": "2026-05-20T14:30:00.000Z"
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 2. GET /chat/conversations/:conversationId

Get a single conversation by ID.

#### Path Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | UUID v4 | ✅ | Conversation ID |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Conversation fetched successfully",
  "data": {
    "id": "conv-uuid",
    "otherParticipant": {
      "id": "user-uuid",
      "name": "Jane Smith",
      "avatar": null,
      "role": "tradie"
    },
    "lastMessage": null,
    "lastMessageAt": "2026-05-18T09:00:00.000Z",
    "unreadCount": 0,
    "createdAt": "2026-05-18T09:00:00.000Z",
    "updatedAt": "2026-05-18T09:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 403 | `CHAT_FORBIDDEN` | Access denied |
| 404 | `CHAT_NOT_FOUND` | Conversation not found |

---

### 3. POST /chat/conversations

Create a new conversation with another user, or return the existing one if it already exists.

**Content-Type:** `application/json`

#### Request Body

```json
{
  "otherUserId": "target-user-uuid"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `otherUserId` | UUID v4 | ✅ | Must be a different, non-deleted user | The other participant |

#### Success Response — `201 Created` (new) or `200 OK` (existing)

```json
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "id": "conv-uuid",
    "otherParticipant": {
      "id": "target-user-uuid",
      "name": "Bob Builder",
      "avatar": "/uploads/profile/bob.jpg",
      "role": "tradie"
    },
    "lastMessage": null,
    "lastMessageAt": "2026-05-21T10:00:00.000Z",
    "unreadCount": 0,
    "createdAt": "2026-05-21T10:00:00.000Z",
    "updatedAt": "2026-05-21T10:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `CHAT_VALIDATION_ERROR` | Cannot create conversation with yourself / User not found or deleted |

---

### 4. GET /chat/conversations/:conversationId/messages

List messages in a conversation using keyset (cursor) pagination, ordered newest-first.

#### Path Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | UUID v4 | ✅ | Conversation ID |

#### Query Parameters

| Param | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `limit` | integer | ❌ | 100 | 1–100 | Max messages to return |
| `before` | UUID v4 | ❌ | — | Must be a message in this conversation | Cursor: fetch messages older than this ID |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Messages fetched successfully",
  "data": {
    "items": [
      {
        "id": "msg-uuid-2",
        "conversationId": "conv-uuid",
        "sender": {
          "id": "user-uuid",
          "name": "Jane Smith",
          "avatar": "/uploads/profile/jane.jpg"
        },
        "content": "Sounds good!",
        "type": "text",
        "attachments": [],
        "status": "sent",
        "createdAt": "2026-05-20T14:31:00.000Z",
        "updatedAt": "2026-05-20T14:31:00.000Z"
      },
      {
        "id": "msg-uuid-1",
        "conversationId": "conv-uuid",
        "sender": {
          "id": "other-user-uuid",
          "name": "Bob Builder",
          "avatar": null
        },
        "content": "Are you available tomorrow?",
        "type": "text",
        "attachments": [],
        "status": "sent",
        "createdAt": "2026-05-20T14:30:00.000Z",
        "updatedAt": "2026-05-20T14:30:00.000Z"
      }
    ],
    "meta": {
      "limit": 100,
      "count": 2,
      "hasMore": false,
      "nextBefore": null
    }
  }
}
```

When `hasMore` is `true`, use `meta.nextBefore` as the `before` query param for the next page.

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 403 | `CHAT_FORBIDDEN` | Access denied |
| 404 | `CHAT_NOT_FOUND` | Conversation not found |

---

### 5. POST /chat/messages

Send a message. This is the canonical write path shared by both REST and Socket.IO.

**Content-Type:** `application/json`

#### Request Body

```json
{
  "conversationId": "conv-uuid",
  "content": "Hello!",
  "type": "text",
  "clientMessageId": "client-generated-uuid"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `conversationId` | UUID v4 | ⚠️ | At least one of `conversationId` or `recipientId` required | Target conversation |
| `recipientId` | UUID v4 | ⚠️ | At least one of `conversationId` or `recipientId` required | Auto-creates conversation if needed |
| `content` | string | ⚠️ | max 5000 chars; required if no attachments | Message text |
| `type` | string | ❌ | `text`, `image`, `video`, `mixed` | Auto-derived from attachments if omitted |
| `attachments` | array | ❌ | max 5 items | Attachment descriptors (from upload endpoint) |
| `clientMessageId` | string | ❌ | max 64 chars | Client-generated dedup/correlation ID |

Cross-field rules:
- At least one of `content` (non-empty) or `attachments` (non-empty array) must be present.
- If `type` is `image`, `video`, or `mixed`, `attachments` must be non-empty.
- If both `conversationId` and `recipientId` are provided, they must be consistent.

#### Success Response — `201 Created`

```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message": {
      "id": "msg-uuid",
      "conversationId": "conv-uuid",
      "sender": {
        "id": "sender-uuid",
        "name": "Jane Smith",
        "avatar": "/uploads/profile/jane.jpg"
      },
      "content": "Hello!",
      "type": "text",
      "attachments": [],
      "status": "sent",
      "createdAt": "2026-05-21T10:05:00.000Z",
      "updatedAt": "2026-05-21T10:05:00.000Z",
      "clientMessageId": "client-generated-uuid"
    },
    "clientMessageId": "client-generated-uuid"
  }
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 400 | `CHAT_VALIDATION_ERROR` | Validation failed |
| 403 | `CHAT_FORBIDDEN` | Not a participant |
| 404 | `CHAT_NOT_FOUND` | Conversation not found |
| 429 | `CHAT_RATE_LIMITED` | Too many chat requests |

---

### 6. POST /chat/messages/upload

Upload file attachments (images/videos). Returns attachment descriptors to include in a subsequent `sendMessage` call.

**Content-Type:** `multipart/form-data`

#### Request Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `files` | file[] | ✅ | 1–5 files | Image or video files |
| `width[0]` | string | ❌ | Integer ≥ 1 | Width of file at index 0 |
| `height[0]` | string | ❌ | Integer ≥ 1 | Height of file at index 0 |
| `durationMs[0]` | string | ❌ | Integer ≥ 0 | Duration in ms (video) at index 0 |
| `thumbnailUrl[0]` | string | ❌ | — | Thumbnail URL for file at index 0 |

Allowed MIME types:
- Images: `image/jpeg`, `image/png`, `image/webp`, `image/gif` (max 10 MB each)
- Videos: `video/mp4`, `video/quicktime`, `video/webm` (max 50 MB each)

#### Success Response — `201 Created`

```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": [
    {
      "url": "/public/chat-attachments/1716300000000-abc123.jpg",
      "type": "image",
      "mime": "image/jpeg",
      "size": 245760,
      "width": 1920,
      "height": 1080
    }
  ]
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 413 | `CHAT_PAYLOAD_TOO_LARGE` | File exceeds size limit for its type |
| 429 | `CHAT_RATE_LIMITED` | Too many upload requests |

---

### 7. POST /chat/conversations/:conversationId/read

Mark messages in a conversation as read.

**Content-Type:** `application/json`

#### Path Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | UUID v4 | ✅ | Conversation ID |

#### Request Body

```json
{
  "lastReadMessageId": "msg-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lastReadMessageId` | UUID v4 | ❌ | Mark read up to this message. If omitted, marks all as read. |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Messages marked as read",
  "data": {
    "conversationId": "conv-uuid",
    "lastReadAt": "2026-05-21T10:10:00.000Z",
    "unreadCount": 0
  }
}
```

#### Error Responses

| Status | Code | Message |
|--------|------|---------|
| 403 | `CHAT_FORBIDDEN` | Access denied |
| 404 | `CHAT_NOT_FOUND` | Conversation not found |

---

## Socket.IO Events

Connection requires a valid JWT token passed during the Socket.IO handshake. On connection, the server automatically:
1. Joins the socket to `user:{userId}` room
2. Auto-subscribes to all conversation rooms the user participates in

### Client → Server Events

---

#### `chat:join`

Subscribe to real-time updates for a specific conversation.

```typescript
// Payload
{ conversationId: string }  // UUID v4
```

On failure, server emits `error` event with `code: 'CHAT_JOIN_FORBIDDEN'`.

---

#### `chat:leave`

Unsubscribe from a conversation room.

```typescript
// Payload
{ conversationId: string }  // UUID v4
```

---

#### `chat:send-message`

Send a message via Socket.IO. Uses the same canonical write path as the REST endpoint.

```typescript
// Payload
{
  conversationId?: string;   // UUID v4
  recipientId?: string;      // UUID v4
  content?: string;          // max 5000 chars
  type?: 'text' | 'image' | 'video' | 'mixed';
  attachments?: Attachment_Descriptor[];  // max 5
  clientMessageId?: string;  // max 64 chars
}

// Ack — Success
{
  success: true;
  message: MessagePayload;
  clientMessageId?: string;
}

// Ack — Failure
{
  success: false;
  error: { code: string; message: string };
}
```

Payload size limit: 64 KB. Exceeding returns ack with `code: 'CHAT_PAYLOAD_TOO_LARGE'`.

---

#### `chat:typing`

Signal that the user is typing. Throttled at 5 events/second per socket.

```typescript
// Payload
{ conversationId: string }  // UUID v4
```

Broadcasts to other participants in the conversation room (excludes sender).

---

#### `chat:stop-typing`

Signal that the user stopped typing. Same throttle as `chat:typing`.

```typescript
// Payload
{ conversationId: string }  // UUID v4
```

---

#### `chat:mark-read`

Mark messages as read via Socket.IO.

```typescript
// Payload
{
  conversationId: string;        // UUID v4
  lastReadMessageId?: string;    // UUID v4 (optional)
}

// Ack — Success
{
  success: true;
  conversationId: string;
  lastReadAt: string;   // ISO 8601
  unreadCount: number;
}

// Ack — Failure
{
  success: false;
  error: { code: string; message: string };
}
```

---

### Server → Client Events

---

#### `chat:message`

Emitted to both participants when a new message is sent.

```typescript
{
  id: string;
  conversationId: string;
  sender: { id: string; name: string; avatar: string | null };
  content: string;
  type: 'text' | 'image' | 'video' | 'mixed';
  attachments: Attachment_Descriptor[];
  status: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
  clientMessageId?: string;
}
```

Delivered to `user:{fromUserId}` and `user:{toUserId}` rooms.

---

#### `chat:typing`

Emitted to conversation room participants (excluding the typer).

```typescript
{
  conversationId: string;
  userId: string;
  name: string;
}
```

---

#### `chat:stop-typing`

Same shape as `chat:typing`.

```typescript
{
  conversationId: string;
  userId: string;
  name: string;
}
```

---

#### `chat:read`

Emitted when a participant marks messages as read.

```typescript
{
  conversationId: string;
  userId: string;
  lastReadMessageId: string | null;
  lastReadAt: string;  // ISO 8601
}
```

---

#### `chat:online-status`

Emitted on user connect/disconnect.

```typescript
{
  userId: string;
  isOnline: boolean;
}
```

---

#### `chat:conversation-updated`

Emitted to each participant (with their perspective) when a conversation is created or updated.

```typescript
{
  conversation: ConversationListItem;  // from the receiving user's perspective
}
```

---

#### `notification:new`

General notification event (not chat-specific, but may carry chat-related notifications).

```typescript
{
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}
```

---

#### `error`

Emitted for socket-level errors (auto-subscribe failure, join forbidden).

```typescript
{
  message: string;
  code?: string;
}
```

---

## Data Types

### Attachment_Descriptor

```typescript
{
  url: string;           // Must start with '/public/chat-attachments/'
  type: 'image' | 'video';
  mime: string;          // Original MIME type
  size: number;          // Bytes, integer ≥ 0
  thumbnailUrl?: string;
  width?: number;        // Integer ≥ 1
  height?: number;       // Integer ≥ 1
  durationMs?: number;   // Integer ≥ 0 (video only)
}
```

### ConversationListItem

```typescript
{
  id: string;
  otherParticipant: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
  };
  lastMessage: {
    id: string;
    content: string;
    type: string;
    attachmentCount: number;
    senderId: string;
    createdAt: string;
  } | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### MessagePayload

```typescript
{
  id: string;
  conversationId: string;
  sender: { id: string; name: string; avatar: string | null };
  content: string;
  type: 'text' | 'image' | 'video' | 'mixed';
  attachments: Attachment_Descriptor[];
  status: string;
  createdAt: string;
  updatedAt: string;
  clientMessageId?: string;
}
```

---

## Deployment & Migration Rollout

### Deploy Order

The chat module must be rolled out in the following sequence:

1. **Deploy code** — The new chat module code is backwards-compatible. Existing endpoints and socket handlers continue to function against the old schema until the migration runs.

2. **Run migration** — Execute `npx sequelize-cli db:migrate` to apply `20260520120001-add-chat-read-state.js`. This migration:
   - Renames `customer_id` → `from_user_id` and `tradie_id` → `to_user_id`.
   - Swaps row values so that every row satisfies `from_user_id < to_user_id` (canonical UUID ordering).
   - Adds a CHECK constraint `chk_conversations_from_lt_to` enforcing the invariant at the DB level.
   - Adds `from_last_read_at` and `to_last_read_at` columns for per-participant read state.
   - Replaces the legacy ascending messages index with a descending composite index for cursor pagination.

3. **Enable new endpoints** — Once the migration completes, the new `/api/v1/chat` REST routes and Socket.IO event handlers are fully operational.

### Non-Reversible Data Swap

> **⚠️ Important:** The migration's step 5 (canonical-order data swap) is **non-reversible**.
>
> The `down` migration restores column **names** (`from_user_id` → `customer_id`, `to_user_id` → `tradie_id`) and re-creates the legacy indexes, but it **cannot** restore the original `customer_id` vs `tradie_id` distinction for any row that was swapped during the `up` run.
>
> This is acceptable because the chat module is role-agnostic by design — the `from`/`to` columns carry no semantic role meaning; they exist solely to enforce a unique pair constraint via canonical ordering.

### Rollback Guidance

If a rollback is required:

1. Run `npx sequelize-cli db:migrate:undo --name 20260520120001-add-chat-read-state.js`.
2. The `down` step will:
   - Drop read-state columns and new indexes.
   - Remove the CHECK constraint.
   - Rename columns back to `customer_id` / `tradie_id`.
   - Re-create the legacy unique and simple indexes.
   - Restore the ascending messages index.
3. **Note:** Rows that were reordered in step 5 will retain their swapped values under the restored column names. No data loss occurs, but the `customer_id` / `tradie_id` semantic mapping is lost for those rows.

### Pre-Deploy Checklist

- [ ] Ensure no other migration is pending that touches the `conversations` or `messages` tables.
- [ ] Back up the `conversations` table before running the migration in production.
- [ ] Verify the application build is clean (`npm run build` passes).
- [ ] Confirm Socket.IO clients are prepared to handle the new event payloads.
