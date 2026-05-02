import { Server } from 'socket.io';
import {
  AuthenticatedSocket,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../socket.types';
import { logger } from '../../common/utils/logger';

// Placeholder — will be fully implemented in Phase 10 when chat module is rebuilt
export const registerChatHandlers = (
  _io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket,
): void => {
  const userId = socket.user.userId;

  socket.on('chat:join', ({ conversationId }) => {
    socket.join(`conversation:${conversationId}`);
    logger.debug(`User ${userId} joined conversation ${conversationId}`);
  });

  socket.on('chat:leave', ({ conversationId }) => {
    socket.leave(`conversation:${conversationId}`);
    logger.debug(`User ${userId} left conversation ${conversationId}`);
  });
};
