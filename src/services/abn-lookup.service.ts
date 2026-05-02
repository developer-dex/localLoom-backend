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

    if (!this.guid) {
      // Dev mode — return mock data
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
      const url = `${this.baseUrl}?abn=${cleanAbn}&callback=&guid=${this.guid}`;
      const response = await fetch(url);
      const text = await response.text();

      // ABR returns JSONP-like response, parse it
      const json = JSON.parse(text);

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
