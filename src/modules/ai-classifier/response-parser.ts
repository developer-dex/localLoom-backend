import { CatalogSnapshot } from './ai-classifier.interface';
import { AiInvalidModelResponseError } from './ai-classifier.errors';

export interface ParsedModelResponse {
  categoryId: string | null;
  regionId: string | null;
}

/**
 * Parses raw model text into a validated ParsedModelResponse.
 *
 * Throws AiInvalidModelResponseError when:
 *   - text is not parseable JSON
 *   - parsed value is not an object
 *   - parsed object lacks `category` or `region` keys
 *   - `category` or `region` is not string | null
 *
 * Resolves catalog membership via case-insensitive matching.
 * Non-matching values are mapped to null.
 */
export function parseAndValidateModelResponse(
  rawText: string,
  catalog: CatalogSnapshot,
): ParsedModelResponse {
  // 1. Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new AiInvalidModelResponseError('Model response is not valid JSON');
  }

  // 2. Shape validation
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

  // 3. Build case-insensitive lookup maps (name → id)
  const categoryLookup = new Map<string, string>();
  for (const c of catalog.categories) {
    categoryLookup.set(c.name.toLowerCase(), c.id);
  }

  const regionLookup = new Map<string, string>();
  for (const r of catalog.regions) {
    regionLookup.set(r.name.toLowerCase(), r.id);
  }

  // 4. Resolve against catalog
  const resolvedCategoryId =
    rawCategory !== null ? (categoryLookup.get(rawCategory.toLowerCase()) ?? null) : null;

  const resolvedRegionId =
    rawRegion !== null ? (regionLookup.get(rawRegion.toLowerCase()) ?? null) : null;

  return {
    categoryId: resolvedCategoryId,
    regionId: resolvedRegionId,
  };
}
