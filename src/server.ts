import http from 'http';
import app from './app';
import { env, connectDatabase } from './config';
import { initializeSocket } from './socket';
import { logger } from './common/utils/logger';

// Import models to register associations before any queries
import './models';

const startServer = async (): Promise<void> => {
  await connectDatabase();

  const httpServer = http.createServer(app);

  const io = initializeSocket(httpServer);

  app.set('io', io);

  httpServer.listen(env.port, '0.0.0.0', () => {
    logger.info(`Server running on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`API base path: ${env.apiPrefix}`);
    logger.info(`API docs: http://localhost:${env.port}/api-docs`);
    if (env.serverHost) {
      logger.info(`API docs (network): http://${env.serverHost}:${env.port}/api-docs`);
    }
    logger.info(`Health check: http://localhost:${env.port}/health`);
  });

  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    httpServer.close(async () => {
      logger.info('HTTP server closed');

      io.close(() => {
        logger.info('Socket.IO server closed');
      });

      const { disconnectDatabase } = await import('./config');
      await disconnectDatabase();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown — could not close connections in time');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason: Error) => {
    logger.error('Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};

startServer();
