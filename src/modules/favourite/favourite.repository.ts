import { Op, fn, col } from 'sequelize';
import {
  Favourite,
  TradieProfile,
  User,
  Category,
  Region,
  Review,
} from '../../models';
import { PaginationOptions, PaginatedResult } from '../../common/interfaces';
import { buildPaginationMeta } from '../../common/utils';

export class FavouriteRepository {
  async findByCustomerAndTradie(customerId: string, tradieProfileId: string): Promise<Favourite | null> {
    return Favourite.findOne({ where: { customerId, tradieProfileId } });
  }

  async create(customerId: string, tradieProfileId: string): Promise<Favourite> {
    return Favourite.create({ customerId, tradieProfileId });
  }

  async deleteByCustomerAndTradie(customerId: string, tradieProfileId: string): Promise<number> {
    return Favourite.destroy({ where: { customerId, tradieProfileId } });
  }

  async tradieProfileExists(tradieProfileId: string): Promise<boolean> {
    const count = await TradieProfile.count({ where: { id: tradieProfileId } });
    return count > 0;
  }

  async listFavourites(
    customerId: string,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<TradieProfile & { favouritedAt: Date; averageRating: number; totalRatingCount: number }>> {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const { count: total, rows } = await Favourite.findAndCountAll({
      where: { customerId },
      include: [
        {
          model: TradieProfile,
          required: true,
          include: [
            { model: User, as: 'user', attributes: ['id', 'name', 'avatar'] },
            { model: Category, as: 'services', through: { attributes: [] }, attributes: ['id', 'name'] },
            { model: Region, as: 'serviceRegions', through: { attributes: [] }, attributes: ['id', 'name'] },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });

    const tradieProfiles = rows
      .map((fav) => {
        const profile = (fav as Favourite & { TradieProfile?: TradieProfile }).TradieProfile;
        if (!profile) return null;
        return Object.assign(profile, { favouritedAt: fav.createdAt });
      })
      .filter((p): p is TradieProfile & { favouritedAt: Date } => p !== null);

    const profileIds = tradieProfiles.map((p) => p.id);

    const reviewStats = profileIds.length
      ? ((await Review.findAll({
          where: { tradieProfileId: { [Op.in]: profileIds }, status: 'approved' },
          attributes: [
            'tradieProfileId',
            [fn('COUNT', col('id')), 'totalCount'],
            [fn('AVG', col('rating')), 'avgRating'],
          ],
          group: ['tradieProfileId'],
          raw: true,
        })) as unknown as { tradieProfileId: string; totalCount: string; avgRating: string }[])
      : [];

    const statsMap = new Map(reviewStats.map((s) => [s.tradieProfileId, s]));

    const data = tradieProfiles.map((profile) => {
      const stats = statsMap.get(profile.id);
      const totalRatingCount = stats ? parseInt(stats.totalCount, 10) : 0;
      const averageRating = stats ? Math.round(parseFloat(stats.avgRating) * 100) / 100 : 0;
      return Object.assign(profile, { averageRating, totalRatingCount });
    });

    return {
      data: data as (TradieProfile & { favouritedAt: Date; averageRating: number; totalRatingCount: number })[],
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}
