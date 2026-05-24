import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { env } from '../../config/env';
import { AiClassifierErrorCode } from './ai-classifier.errors';

export const aiClassifierRateLimiter = rateLimit({
  windowMs: env.aiClassifier.rateLimitWindowMs,
  max: env.aiClassifier.rateLimitMax,
  keyGenerator: (req: Request) => {
    return req.ip ?? 'unknown';
  },
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many classification requests, please try again later',
    code: AiClassifierErrorCode.RateLimited,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
