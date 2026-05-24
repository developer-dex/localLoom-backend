import { Router } from 'express';
import { AiClassifierController } from './ai-classifier.controller';
import { validate } from '../../middleware';
import { aiClassifierRateLimiter } from './ai-classifier.rate-limiter';
import { classifyServiceSchema } from './ai-classifier.validation';

const router = Router();
const controller = new AiClassifierController();

router.post(
  '/classify-service',
  // aiClassifierRateLimiter, // TODO: re-enable rate limiting before production
  validate(classifyServiceSchema),
  controller.classify,
);

export default router;
