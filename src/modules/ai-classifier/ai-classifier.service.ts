import { logger } from '../../common/utils/logger';
import { env } from '../../config/env';
import { ClassificationResult } from './ai-classifier.interface';
import {
  AiCatalogUnavailableError,
  AiInvalidModelResponseError,
  AiProviderError,
  AiProviderTimeoutError,
} from './ai-classifier.errors';
import { CatalogLoader } from './catalog-loader';
import { AnthropicClassifierClient } from './anthropic-client';
import { buildClassifierSystemPrompt } from './prompt-builder';
import { parseAndValidateModelResponse } from './response-parser';

export interface AiClassifierServiceDeps {
  catalogLoader: CatalogLoader;
  anthropicClient: AnthropicClassifierClient;
  logger?: typeof logger;
}

export class AiClassifierService {
  private catalogLoader: CatalogLoader;
  private anthropicClient: AnthropicClassifierClient;
  private log: typeof logger;

  constructor(deps: AiClassifierServiceDeps) {
    this.catalogLoader = deps.catalogLoader;
    this.anthropicClient = deps.anthropicClient;
    this.log = deps.logger ?? logger;
  }

  async classify(input: {
    userId: string;
    prompt: string;
    requestId: string;
  }): Promise<ClassificationResult> {
    const { userId, prompt, requestId } = input;
    const startedAt = Date.now();
    const baseLog = {
      module: 'ai-classifier',
      userId,
      requestId,
      promptLength: prompt.length,
    };

    this.log.info('classify_request_received', baseLog);

    // Development mode: skip Anthropic call, return random IDs from catalog
    if (env.aiClassifier.aiMode === 'development') {
      return this.classifyDevelopmentMode(baseLog, startedAt);
    }

    if (env.aiClassifier.debugLogPrompt) {
      this.log.debug('classify_request_prompt', { ...baseLog, prompt });
    }

    try {
      // 1. Load catalog
      const catalog = await this.loadCatalog(baseLog);

      // 2. Guard: empty categories → 503
      if (catalog.categories.length === 0) {
        throw new AiCatalogUnavailableError('No active categories available');
      }

      // 3. Build system prompt
      const systemPrompt = buildClassifierSystemPrompt(catalog);

      // 4. Call Anthropic with one-retry on invalid JSON
      let retried = false;
      let result: ClassificationResult;

      try {
        const response = await this.anthropicClient.classify({
          systemPrompt,
          userPrompt: prompt,
        });
        result = parseAndValidateModelResponse(response.rawText, catalog);

        this.log.info('classify_request_completed', {
          ...baseLog,
          model: response.modelId,
          latencyMs: Date.now() - startedAt,
          outcome: 'ok',
          categoryIdReturned: result.categoryId,
          regionIdReturned: result.regionId,
          retried,
        });
      } catch (firstErr) {
        // Only retry on invalid model response (JSON parse / shape errors)
        if (!(firstErr instanceof AiInvalidModelResponseError)) {
          throw firstErr;
        }

        retried = true;
        this.log.warn('classify_invalid_response_retrying', {
          ...baseLog,
          attempt: 1,
          error: (firstErr as Error).message,
        });

        // Retry: second attempt
        const retryResponse = await this.anthropicClient.classify({
          systemPrompt,
          userPrompt: prompt,
        });

        try {
          result = parseAndValidateModelResponse(retryResponse.rawText, catalog);
        } catch (secondErr) {
          // Second attempt also failed — give up
          if (secondErr instanceof AiInvalidModelResponseError) {
            this.log.error('classify_invalid_response_after_retry', {
              ...baseLog,
              latencyMs: Date.now() - startedAt,
              outcome: 'invalid_model_response',
            });
            throw secondErr;
          }
          throw secondErr;
        }

        this.log.info('classify_request_completed', {
          ...baseLog,
          model: retryResponse.modelId,
          latencyMs: Date.now() - startedAt,
          outcome: 'ok',
          categoryIdReturned: result.categoryId,
          regionIdReturned: result.regionId,
          retried,
        });
      }

      return result;
    } catch (err) {
      // Log failures that haven't been logged yet
      if (
        err instanceof AiCatalogUnavailableError ||
        err instanceof AiProviderTimeoutError ||
        err instanceof AiProviderError ||
        err instanceof AiInvalidModelResponseError
      ) {
        this.log.error('classify_request_failed', {
          ...baseLog,
          latencyMs: Date.now() - startedAt,
          outcome: this.outcomeForError(err),
        });
      }
      throw err;
    }
  }

  /**
   * Development mode: returns random category and region IDs from the active catalog.
   * No Anthropic API call is made.
   */
  private async classifyDevelopmentMode(
    baseLog: Record<string, unknown>,
    startedAt: number,
  ): Promise<ClassificationResult> {
    const catalog = await this.loadCatalog(baseLog);

    if (catalog.categories.length === 0) {
      throw new AiCatalogUnavailableError('No active categories available');
    }

    const randomCategory =
      catalog.categories[Math.floor(Math.random() * catalog.categories.length)];
    const randomRegion =
      catalog.regions.length > 0
        ? catalog.regions[Math.floor(Math.random() * catalog.regions.length)]
        : null;

    const result: ClassificationResult = {
      categoryId: randomCategory.id,
      regionId: randomRegion?.id ?? null,
    };

    this.log.info('classify_request_completed', {
      ...baseLog,
      mode: 'development',
      latencyMs: Date.now() - startedAt,
      outcome: 'ok_dev_mode',
      categoryIdReturned: result.categoryId,
      regionIdReturned: result.regionId,
    });

    return result;
  }

  private async loadCatalog(baseLog: Record<string, unknown>) {
    try {
      return await this.catalogLoader.getCatalog();
    } catch (err) {
      this.log.error('classify_catalog_load_failed', {
        ...baseLog,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new AiCatalogUnavailableError('Failed to load service catalog');
    }
  }

  private outcomeForError(err: unknown): string {
    if (err instanceof AiCatalogUnavailableError) return 'catalog_unavailable';
    if (err instanceof AiProviderTimeoutError) return 'provider_timeout';
    if (err instanceof AiProviderError) return 'provider_error';
    if (err instanceof AiInvalidModelResponseError) return 'invalid_model_response';
    return 'unknown_error';
  }
}
