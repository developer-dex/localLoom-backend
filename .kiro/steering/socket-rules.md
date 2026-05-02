---
inclusion: fileMatch
fileMatchPattern: "src/socket/**/*.ts"
---

# Socket.IO Rules

## Architecture

- Socket initialization lives in `src/socket/index.ts` — creates the `Server` instance, applies auth middleware, registers handlers
- Socket handlers live in `src/socket/handlers/` — each handler is a function that receives `(io, socket)` and registers events
- Socket types live in `src/socket/socket.types.ts` — typed events for `ServerToClientEvents` and `ClientToServerEvents`
- Socket auth middleware lives in `src/socket/socket.middleware.ts` — JWT verification via `socketAuthMiddleware`

## Handler Pattern

```typescript
import { Server } from 'socket.io';
import { AuthenticatedSocket, ServerToClientEvents, ClientToServerEvents } from '../socket.types';
import { logger } from '../../common/utils/logger';

export const registerFeatureHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket,
): void => {
  const userId = socket.user.userId;

  socket.on('feature:action', async (data, callback) => {
    try {
      // Business logic via service
      callback({ success: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Socket feature:action error: ${msg}`);
      callback({ success: false, error: msg });
    }
  });
};
```

## Rules

- Use `AuthenticatedSocket` type — never raw `Socket`
- Socket events use namespace pattern: `domain:action` (e.g., `chat:send-message`, `chat:typing`)
- Always authenticate via `socketAuthMiddleware` (applied in `src/socket/index.ts`)
- Use rooms for conversations: `conversation:<id>` and user-specific: `user:<id>`
- Online user tracking is managed via a `Map<string, Set<string>>` in `src/socket/index.ts`
- Always handle errors in socket handlers with try/catch and use the callback for ack
- Register new handlers in `src/socket/index.ts` inside the `io.on('connection')` callback
- Export new handlers from `src/socket/handlers/index.ts`
- Add new event types to both `ServerToClientEvents` and `ClientToServerEvents` in `socket.types.ts`
