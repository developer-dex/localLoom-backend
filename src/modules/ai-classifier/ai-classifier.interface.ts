export interface ClassifyRequestBody {
  prompt: string;
}

export interface ClassificationResult {
  categoryId: string | null;
  regionId: string | null;
}

export interface CatalogCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface CatalogRegion {
  id: string;
  name: string;
}

export interface CatalogSnapshot {
  categories: ReadonlyArray<CatalogCategory>;
  regions: ReadonlyArray<CatalogRegion>;
  loadedAt: number;
}
