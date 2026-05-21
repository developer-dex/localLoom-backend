import Anthropic from '@anthropic-ai/sdk';

import { AiProviderError, AiProviderTimeoutError } from './ai-classifier.errors';

export interface AnthropicClassifierClient {
  classify(input: {
    systemPrompt: string;
    userPrompt: string;
    /** Override per call; falls back to client defaults from env. */
    timeoutMs?: number;
  }): Promise<{ rawText: string; modelId: string; latencyMs: number }>;
}

export interface AnthropicClientOptions {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

/**
 * Maps Anthropic SDK errors to module-specific error classes.
 *
 * - APIConnectionTimeoutError → AiProviderTimeoutError (504)
 * - APIConnectionError → AiProviderTimeoutError (504) — no response received
 * - APIError (any non-2xx from Anthropic) → AiProviderError (502)
 * - Unknown errors bubble up as-is to the global handler (500)
 */
export function normalizeAnthropicError(err: unknown): Error {
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return new AiProviderTimeoutError();
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AiProviderTimeoutError();
  }
  if (err instanceof Anthropic.APIError) {
    return new AiProviderError(`Anthropic API error: ${err.status}`);
  }
  return err instanceof Error ? err : new Error(String(err));
}

export function createAnthropicClassifierClient(
  options: AnthropicClientOptions,
): AnthropicClassifierClient {
  const sdk = new Anthropic({
    apiKey: options.apiKey,
    timeout: options.timeoutMs,
  });

  return {
    async classify({ systemPrompt, userPrompt, timeoutMs }) {
      const startedAt = Date.now();
      try {
        const response = await sdk.messages.create(
          {
            model: options.model,
            max_tokens: options.maxTokens,
            temperature: options.temperature,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          },
          { timeout: timeoutMs ?? options.timeoutMs },
        );

        const block = response.content.find((b) => b.type === 'text');
        const rawText = block && block.type === 'text' ? block.text : '';

        return {
          rawText,
          modelId: response.model,
          latencyMs: Date.now() - startedAt,
        };
      } catch (err) {
        throw normalizeAnthropicError(err);
      }
    },
  };
}
