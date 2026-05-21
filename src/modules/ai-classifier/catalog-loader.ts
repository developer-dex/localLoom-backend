import { Category, Region } from '../../models';
import { CatalogSnapshot } from './ai-classifier.interface';

export interface CatalogLoader {
  getCatalog(): Promise<CatalogSnapshot>;
  /** Test-only; clears the in-memory cache. */
  invalidate(): void;
}

export interface CatalogLoaderOptions {
  /** In-memory TTL in ms. 0 disables caching. */
  cacheTtlMs: number;
}

async function fetchFresh(): Promise<CatalogSnapshot> {
  const [categories, regions] = await Promise.all([
    Category.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'description'],
      order: [
        ['sortOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    }),
    Region.findAll({
      where: { isActive: true },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    }),
  ]);

  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name, description: c.description })),
    regions: regions.map((r) => ({ id: r.id, name: r.name })),
    loadedAt: Date.now(),
  };
}

export function createCatalogLoader(options: CatalogLoaderOptions): CatalogLoader {
  let cached: CatalogSnapshot | null = null;
  let inFlight: Promise<CatalogSnapshot> | null = null;

  async function getCatalog(): Promise<CatalogSnapshot> {
    const now = Date.now();

    if (cached && options.cacheTtlMs > 0 && now - cached.loadedAt < options.cacheTtlMs) {
      return cached;
    }

    // Single-flight: collapse concurrent refreshes into one DB round-trip
    if (inFlight) return inFlight;

    inFlight = fetchFresh()
      .then((snap) => {
        cached = snap;
        return snap;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  }

  return {
    getCatalog,
    invalidate: () => {
      cached = null;
    },
  };
}
