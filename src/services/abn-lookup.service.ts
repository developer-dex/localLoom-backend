import { env } from '../config/env';
import { logger } from '../common/utils/logger';

export interface AbnLookupResult {
  abn: string;
  abnStatus: string;
  entityName: string;
  entityType: string;
  state: string;
  postcode: string;
  isActive: boolean;
}

/**
 * Parse an ABR response body. ABR normally returns plain JSON, but if a
 * `callback` query parameter is sent it wraps the body in a JSONP envelope
 * of the form `callback({...})`. Accept both shapes defensively so we never
 * surface a raw `Unexpected token 'c', "callback({"...` parse error.
 */
function parseAbrPayload(text: string): Record<string, any> {
  const trimmed = text.trim();

  // Detect JSONP envelope: "<identifier>(<json>)"
  const jsonpMatch = trimmed.match(/^[A-Za-z_$][\w$]*\(([\s\S]*)\)\s*;?\s*$/);
  const jsonText = jsonpMatch ? jsonpMatch[1] : trimmed;

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error('ABR returned an unparseable response body');
  }
}

/**
 * ABN Lookup Service — validates Australian Business Numbers via the ABR API.
 *
 * In dev mode (no ABN_LOOKUP_GUID configured): returns mock data.
 * In production: calls the real ABR (Australian Business Register) API.
 *
 * API docs: https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx
 */
export class AbnLookupService {
  private guid: string;
  private baseUrl = 'https://abr.business.gov.au/json/AbnDetails.aspx';

  constructor() {
    this.guid = env.abnLookup?.guid || '';
  }

  async lookup(abn: string): Promise<AbnLookupResult> {
    // Strip spaces from ABN
    const cleanAbn = abn.replace(/\s/g, '');

    // Dev mode — skip the real ABR API entirely and return mock data.
    // Triggered when running in development OR when no ABN_LOOKUP_GUID is configured.
    if (env.isDevelopment || !this.guid) {
      logger.info(`[DEV] ABN lookup for ${cleanAbn} — returning mock data`);
      return {
        abn: cleanAbn,
        abnStatus: 'Active',
        entityName: 'Mock Business Pty Ltd',
        entityType: 'Australian Private Company',
        state: 'VIC',
        postcode: '3000',
        isActive: true,
      };
    }

    try {
      // NOTE: do NOT pass a `callback` query parameter — when present, ABR
      // returns a JSONP envelope of the form `callback({...})` which breaks
      // JSON.parse. Without it, ABR returns plain JSON.
      const url = `${this.baseUrl}?abn=${encodeURIComponent(cleanAbn)}&guid=${encodeURIComponent(this.guid)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`ABR responded with HTTP ${response.status} ${response.statusText}`.trim());
      }

      const text = await response.text();
      const json = parseAbrPayload(text);

      if (json.Message) {
        throw new Error(json.Message);
      }

      const isActive = json.AbnStatus === 'Active';
      const entityName = json.EntityName || json.BusinessName?.[0]?.organisationName || '';

      return {
        abn: json.Abn,
        abnStatus: json.AbnStatus,
        entityName,
        entityType: json.EntityTypeName || '',
        state: json.AddressState || '',
        postcode: json.AddressPostcode || '',
        isActive,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`ABN lookup failed for ${cleanAbn}: ${msg}`);
      throw new Error(`ABN lookup failed: ${msg}`);
    }
  }
}
