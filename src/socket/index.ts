import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { socketAuthMiddleware } from './socket.middleware';
import { registerChatHandlers, registerNotificationHandlers } from './handlers';
import {
  AuthenticatedSocket,
  ServerToClientEvents,
  ClientToServerEvents,
} from './socket.types';
import { env } from '../config/env';
import { logger } from '../common/utils/logger';
import { User } from '../models/user.model';

const onlineUsers = new Map<string, Set<string>>();

export const initializeSocket = (
  httpServer: HttpServer,
): Server<ClientToServerEvents, ServerToClientEvents> => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: env.cors.origin.split(',').map((o) => o.trim()),
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
    transports: ['websocket', 'polling'],
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const authSocket = socket as unknown as AuthenticatedSocket;
    const userId = authSocket.user.userId;

    logger.info(`Socket connected: ${socket.id} | User: ${userId}`);

    // Resolve user name for richer connect log (non-blocking)
    void (async () => {
      try {
        const user = await User.findByPk(userId, { attributes: ['name'] });
        const name = user?.name ?? '(unknown)';
        logger.info(`User connected to socket → id: ${userId} | name: ${name} | socketId: ${socket.id}`);
      } catch (err) {
        logger.error(`Failed to resolve user name on socket connect [${userId}]:`, err);
      }
    })();

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    io.emit('chat:online-status', { userId, isOnline: true });

    registerChatHandlers(io, authSocket);
    registerNotificationHandlers(io, authSocket);

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} | Reason: ${reason}`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('chat:online-status', { userId, isOnline: false });
        }
      }
    });

    socket.on('error', (error) => {
      logger.error(`Socket error [${socket.id}]:`, error);
    });
  });

  logger.info('Socket.IO server initialized');

  return io;
};

export const getOnlineUsers = (): string[] => Array.from(onlineUsers.keys());

export const isUserOnline = (userId: string): boolean => onlineUsers.has(userId);
