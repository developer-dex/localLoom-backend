import { CatalogSnapshot } from './ai-classifier.interface';
import { AiInvalidModelResponseError } from './ai-classifier.errors';
import { logger } from '../../common/utils/logger';

export interface ParsedModelResponse {
  categoryId: string | null;
  regionId: string | null;
}

/**
 * Extracts a JSON object from the raw model text, handling common issues:
 * - Markdown code fences (```json ... ``` or ``` ... ```)
 * - Leading/trailing prose or whitespace before/after the JSON
 * - Multiple lines where only one contains valid JSON
 *
 * Returns the extracted JSON string or null if extraction fails.
 */
function extractJson(rawText: string): string | null {
  let text = rawText.trim();

  // Strip markdown code fences
  const codeFenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (codeFenceMatch) {
    text = codeFenceMatch[1].trim();
  }

  // If the text starts with '{', try it directly
  if (text.startsWith('{')) {
    const endIdx = text.lastIndexOf('}');
    if (endIdx !== -1) {
      return text.slice(0, endIdx + 1);
    }
  }

  // Otherwise, scan line by line for a JSON object
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }
  }

  // Last resort: find first '{' to last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

/**
 * Parses raw model text into a validated ParsedModelResponse.
 *
 * Throws AiInvalidModelResponseError when:
 *   - text contains no extractable JSON object
 *   - parsed value is not an object
 *   - parsed object lacks `category` or `region` keys
 *   - `category` or `region` is not string | null
 *
 * Resolves catalog membership via case-insensitive matching.
 * Non-matching values are mapped to null (graceful fallback, not an error).
 */
export function parseAndValidateModelResponse(
  rawText: string,
  catalog: CatalogSnapshot,
): ParsedModelResponse {
  // 1. Extract JSON from potentially noisy output
  const jsonStr = extractJson(rawText);
  if (!jsonStr) {
    logger.warn('[ai-classifier] Could not extract JSON from model response', { rawText });
    throw new AiInvalidModelResponseError('Model response does not contain valid JSON');
  }

  // 2. Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    logger.warn('[ai-classifier] JSON parse failed after extraction', { extracted: jsonStr });
    throw new AiInvalidModelResponseError('Model response is not valid JSON');
  }

  // 3. Shape validation
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new AiInvalidModelResponseError('Model response is not a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  if (!('category' in obj) || !('region' in obj)) {
    throw new AiInvalidModelResponseError(
      'Model response is missing required keys "category" and/or "region"',
    );
  }

  const rawCategory = obj.category;
  const rawRegion = obj.region;

  if (rawCategory !== null && typeof rawCategory !== 'string') {
    throw new AiInvalidModelResponseError('"category" must be a string or null');
  }

  if (rawRegion !== null && typeof rawRegion !== 'string') {
    throw new AiInvalidModelResponseError('"region" must be a string or null');
  }

  // 4. Build case-insensitive lookup maps (name → id)
  const categoryLookup = new Map<string, string>();
  for (const c of catalog.categories) {
    categoryLookup.set(c.name.toLowerCase(), c.id);
  }

  const regionLookup = new Map<string, string>();
  for (const r of catalog.regions) {
    regionLookup.set(r.name.toLowerCase(), r.id);
  }

  // 5. Resolve against catalog (case-insensitive, trimmed)
  let resolvedCategoryId: string | null = null;
  if (rawCategory !== null) {
    const normalized = rawCategory.trim().toLowerCase();
    resolvedCategoryId = categoryLookup.get(normalized) ?? null;

    // If exact match fails, try fuzzy: strip hyphens, extra spaces, punctuation
    if (!resolvedCategoryId) {
      const stripped = normalized.replace(/[-_\s.]+/g, '');
      for (const [name, id] of categoryLookup.entries()) {
        if (name.replace(/[-_\s.]+/g, '') === stripped) {
          resolvedCategoryId = id;
          break;
        }
      }
    }

    if (!resolvedCategoryId) {
      logger.warn('[ai-classifier] Category from model not found in catalog', {
        modelReturned: rawCategory,
        catalogSize: catalog.categories.length,
      });
    }
  }

  let resolvedRegionId: string | null = null;
  if (rawRegion !== null) {
    const normalized = rawRegion.trim().toLowerCase();
    resolvedRegionId = regionLookup.get(normalized) ?? null;

    // Fuzzy fallback for regions
    if (!resolvedRegionId) {
      const stripped = normalized.replace(/[-_\s.]+/g, '');
      for (const [name, id] of regionLookup.entries()) {
        if (name.replace(/[-_\s.]+/g, '') === stripped) {
          resolvedRegionId = id;
          break;
        }
      }
    }

    if (!resolvedRegionId) {
      logger.warn('[ai-classifier] Region from model not found in catalog', {
        modelReturned: rawRegion,
        catalogSize: catalog.regions.length,
      });
    }
  }

  return {
    categoryId: resolvedCategoryId,
    regionId: resolvedRegionId,
  };
}
