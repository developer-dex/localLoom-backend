import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { COMMON_MESSAGES } from '../common/constants';

export const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  message: {
    success: false,
    statusCode: 429,
    message: COMMON_MESSAGES.TOO_MANY_REQUESTS,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
