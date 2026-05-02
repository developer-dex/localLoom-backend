import { Server } from 'socket.io';
import {
  AuthenticatedSocket,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../socket.types';
import { logger } from '../../common/utils/logger';

export const registerNotificationHandlers = (
  _io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket,
): void => {
  const userId = socket.user.userId;

  socket.join(`user:${userId}`);
  logger.debug(`User ${userId} joined notification room`);
};

export const sendNotificationToUser = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  userId: string,
  notification: {
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  },
): void => {
  io.to(`user:${userId}`).emit('notification:new', notification);
};
