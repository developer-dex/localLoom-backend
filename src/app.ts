import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { corsOptions } from './config/cors';
import { swaggerSpec } from './config/swagger';
import { env } from './config/env';
import { errorHandler, apiLimiter } from './middleware';
import routes from './routes';
import { logger } from './common/utils/logger';

const app: Application = express();

// ── Security (disable CSP for Swagger so it works via any host/IP) ──
app.use('/api-docs', helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(helmet());
app.use(cors(corsOptions));

// ── Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Compression ──
app.use(compression());

// ── Logging ──
app.use(
  morgan('combined', {
    stream: { write: (message: string) => logger.info(message.trim()) },
  }),
);

// ── Rate Limiting ──
// app.use(apiLimiter); // TODO: re-enable rate limiting before production

// ── Static files (allow cross-origin embedding so the admin SPA on a
// different origin can render uploaded images/videos via <img> / <video>;
// helmet's default CORP is `same-origin` which blocks this) ──
const allowCrossOriginEmbed = (_req: Request, res: Response, next: () => void) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
};
app.use('/uploads', allowCrossOriginEmbed, express.static(env.upload.dir));
app.use('/public', allowCrossOriginEmbed, express.static('public'));

// ── API Documentation ──
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'LocalLoom API Docs',
}));

// ── Health check ──
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'LocalLoom backend is running',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// ── API Routes ──
app.use(env.apiPrefix, routes);

// ── 404 handler ──
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: 'Route not found',
  });
});

// ── Global error handler ──
app.use(errorHandler);

export default app;
