import { CorsOptions } from 'cors';
import { env } from './env';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = env.cors.origin.split(',').map((o) => o.trim());

    // Allow all origins if wildcard is configured
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // In development, allow all origins
    if (env.isDevelopment) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Total-Pages'],
};
