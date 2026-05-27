import { FavouriteRepository } from './favourite.repository';
import { Favourite, TradieProfile } from '../../models';
import {
  ConflictException,
  NotFoundException,
} from '../../common/exceptions';
import { FAVOURITE_MESSAGES, TRADIE_MESSAGES } from '../../common/constants';
import { PaginatedResult } from '../../common/interfaces';

export class FavouriteService {
  private repo: FavouriteRepository;

  constructor() {
    this.repo = new FavouriteRepository();
  }

  async addFavourite(customerId: string, tradieProfileId: string): Promise<Favourite> {
    const exists = await this.repo.tradieProfileExists(tradieProfileId);
    if (!exists) {
      throw new NotFoundException(TRADIE_MESSAGES.PROFILE_NOT_FOUND);
    }

    const existing = await this.repo.findByCustomerAndTradie(customerId, tradieProfileId);
    if (existing) {
      throw new ConflictException(FAVOURITE_MESSAGES.ALREADY_EXISTS);
    }

    return this.repo.create(customerId, tradieProfileId);
  }

  async removeFavourite(customerId: string, tradieProfileId: string): Promise<void> {
    const deleted = await this.repo.deleteByCustomerAndTradie(customerId, tradieProfileId);
    if (deleted === 0) {
      throw new NotFoundException(FAVOURITE_MESSAGES.NOT_FOUND);
    }
  }

  async listFavourites(
    customerId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<TradieProfile & { favouritedAt: Date; averageRating: number; totalRatingCount: number }>> {
    return this.repo.listFavourites(customerId, { page, limit, sort: 'createdAt', order: 'desc' });
  }
}
