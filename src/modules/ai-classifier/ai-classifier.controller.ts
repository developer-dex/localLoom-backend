import { Request, Response } from 'express';
import { AiClassifierService } from './ai-classifier.service';
import { ApiResponse, asyncHandler } from '../../common/utils';
import { createCatalogLoader } from './catalog-loader';
import { createAnthropicClassifierClient } from './anthropic-client';
import { env } from '../../config/env';
import { randomUUID } from 'crypto';

export class AiClassifierController {
  private service: AiClassifierService;

  constructor() {
    const catalogLoader = createCatalogLoader({
      cacheTtlMs: env.aiClassifier.catalogCacheTtlMs,
    });

    const anthropicClient = createAnthropicClassifierClient({
      apiKey: env.aiClassifier.anthropicApiKey,
      model: env.aiClassifier.model,
      maxTokens: env.aiClassifier.maxTokens,
      temperature: env.aiClassifier.temperature,
      timeoutMs: env.aiClassifier.timeoutMs,
    });

    this.service = new AiClassifierService({ catalogLoader, anthropicClient });
  }

  classify = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.ip ?? 'anonymous';
    const { prompt } = req.body;
    const requestId = (req.headers['x-request-id'] as string) ?? randomUUID();

    const result = await this.service.classify({ userId, prompt, requestId });
    ApiResponse.success(res, result, 'Service classified successfully');
  });
}
