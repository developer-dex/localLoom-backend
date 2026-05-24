import { env } from '../../config/env';
import { TradieProfile } from '../../models';

/**
 * Prepend the backend base URL to a stored image path.
 * - Returns null/empty values unchanged.
 * - Returns already-absolute http(s) URLs unchanged.
 * - Otherwise prefixes the path with `env.backendBaseUrl`, ensuring exactly one '/' between them.
 */
export function toAbsoluteUrl(value: string | null | undefined): string | null | undefined {
  if (value === null || value === undefined || value === '') return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;

  const base = env.backendBaseUrl.replace(/\/+$/, '');
  const path = value.startsWith('/') ? value : `/${value}`;
  return `${base}${path}`;
}

/**
 * Transform image URL fields on a tradie profile (and its associations) to absolute URLs.
 * Operates on a plain JSON copy so the persisted Sequelize instance is never mutated.
 */
export function serializeTradieProfile(profile: TradieProfile): Record<string, unknown> {
  const plain = profile.toJSON() as unknown as Record<string, unknown> & {
    businessImages?: string[] | null;
    profilePhoto?: string | null;
    introVideoUrl?: string | null;
    user?: { avatar?: string | null } | null;
    workPhotos?: Array<{ imageUrl?: string | null }> | null;
  };

  if (Array.isArray(plain.businessImages)) {
    plain.businessImages = plain.businessImages.map((p) => toAbsoluteUrl(p) as string);
  }

  plain.profilePhoto = toAbsoluteUrl(plain.profilePhoto) as string | null | undefined;

  plain.introVideoUrl = toAbsoluteUrl(plain.introVideoUrl) as string | null | undefined;

  if (plain.user && plain.user.avatar !== undefined) {
    plain.user.avatar = toAbsoluteUrl(plain.user.avatar) as string | null | undefined;
  }

  if (Array.isArray(plain.workPhotos)) {
    plain.workPhotos = plain.workPhotos.map((w) => ({
      ...w,
      imageUrl: toAbsoluteUrl(w.imageUrl) as string,
    }));
  }

  return plain;
}
