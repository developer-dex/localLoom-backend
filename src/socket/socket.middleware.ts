import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { env } from '../config/env';
import type { AuthenticatedSocket } from './socket.types';
import { AuthPayload } from '../common/interfaces';
import { logger } from '../common/utils/logger';

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void): void => {
  const authSocket = socket as AuthenticatedSocket;
  const token =
    authSocket.handshake.auth?.token ||
    authSocket.handshake.headers?.authorization?.split(' ')[1];

  if (!token) {
    logger.warn(`Socket auth failed: no token provided [${socket.id}]`);
    return next(new Error('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret) as AuthPayload;
    authSocket.user = decoded;
    next();
  } catch {
    logger.warn(`Socket auth failed: invalid token [${socket.id}]`);
    next(new Error('Invalid authentication token'));
  }
};
