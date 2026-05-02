import { PaginationQuery } from '../interfaces';
import { PaginationOptions, PaginationMeta } from '../interfaces';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const parsePaginationQuery = (query: PaginationQuery): PaginationOptions => {
  const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
  const rawLimit = Math.max(Number(query.limit) || DEFAULT_LIMIT, 1);
  const limit = Math.min(rawLimit, MAX_LIMIT);
  const sort = query.sort || 'createdAt';
  const order = query.order === 'asc' ? 'asc' : 'desc';

  return { page, limit, sort, order };
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number,
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
