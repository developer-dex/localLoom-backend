import { CatalogSnapshot } from './ai-classifier.interface';

/**
 * Builds the system prompt for the AI classifier.
 * Pure function — deterministic output for the same catalog input.
 */
export function buildClassifierSystemPrompt(catalog: CatalogSnapshot): string {
  const categoryLines = catalog.categories.map((c) => {
    if (c.description) {
      return `  - "${c.name}" — ${c.description}`;
    }
    return `  - "${c.name}"`;
  });

  const regionLines =
    catalog.regions.length > 0
      ? catalog.regions.map((r) => `  - "${r.name}"`)
      : ['  (no regions configured)'];

  return `You are a service classifier for LocalLoom, an Australian platform connecting customers with local
tradies. You receive a single user message describing the service the customer needs.

Your job is to map the user's message to two fields drawn from fixed catalogs:

  - "category": the single best-matching service category from the CATEGORY LIST below,
    or null if no category is a reasonable match.
  - "region": the region from the REGION LIST below that the user explicitly mentions,
    or null if the user did not mention a region or the mentioned location is not in the list.

Rules:
  1. The "category" value MUST be either null or an exact, case-sensitive name from the CATEGORY LIST.
  2. The "region" value MUST be either null or an exact, case-sensitive name from the REGION LIST.
  3. Do NOT invent categories or regions. Do NOT translate, abbreviate, or pluralize them.
  4. If the user's message contains no clear service intent, return {"category": null, "region": null}.
  5. Return ONLY a single JSON object on one line, with exactly the keys "category" and "region",
     and no surrounding prose, markdown, code fences, or commentary.

CATEGORY LIST:
${categoryLines.join('\n')}

REGION LIST:
${regionLines.join('\n')}

Output format (this exact shape, nothing else):
{"category": <string|null>, "region": <string|null>}`;
}
