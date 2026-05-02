import { Op, WhereOptions, Includeable, fn, col, literal } from 'sequelize';
import {
  TradieProfile, User, Category, Region, TradieService, TradieRegion,
  TradieWorkPhoto, Review, Favourite,
  ITradieProfileCreationAttributes, ITradieProfileAttributes,
} from '../../models';
import { PaginationOptions, PaginatedResult } from '../../common/interfaces';
import { buildPaginationMeta } from '../../common/utils';

const publicUserAttrs = ['id', 'name', 'phone', 'email', 'avatar', 'overallRating'];
const publicUserAttrsNoContact = ['id', 'name', 'avatar', 'overallRating'];

export class TradieRepository {
  async findById(id: string): Promise<TradieProfile | null> {
    return TradieProfile.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: publicUserAttrs },
        { model: Category, as: 'services', through: { attributes: [] } },
        { model: Region, as: 'serviceRegions', through: { attributes: [] } },
        { model: TradieWorkPhoto, as: 'workPhotos', order: [['sortOrder', 'ASC']] },
      ],
    });
  }

  async findByIdPublic(id: string): Promise<TradieProfile | null> {
    return TradieProfile.findOne({
      where: { id, profileStatus: 'approved' },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'avatar', 'phone', 'email'] },
        { model: Category, as: 'services', through: { attributes: [] }, attributes: ['id', 'name'] },
        { model: Region, as: 'serviceRegions', through: { attributes: [] } },
        { model: TradieWorkPhoto, as: 'workPhotos', order: [['sortOrder', 'ASC']] },
      ],
    });
  }

  async findByIdPublicWithContact(id: string): Promise<TradieProfile | null> {
    return TradieProfile.findOne({
      where: { id, profileStatus: 'approved' },
      include: [
        { model: User, as: 'user', attributes: publicUserAttrs },
        { model: Category, as: 'services', through: { attributes: [] } },
        { model: Region, as: 'serviceRegions', through: { attributes: [] } },
      ],
    });
  }

  async findByUserId(userId: string): Promise<TradieProfile | null> {
    return TradieProfile.findOne({
      where: { userId },
      include: [
        { model: Category, as: 'services', through: { attributes: [] } },
        { model: Region, as: 'serviceRegions', through: { attributes: [] } },
        { model: TradieWorkPhoto, as: 'workPhotos', order: [['sortOrder', 'ASC']] },
      ],
    });
  }

  async create(data: ITradieProfileCreationAttributes): Promise<TradieProfile> {
    return TradieProfile.create(data);
  }

  async update(id: string, data: Partial<ITradieProfileAttributes>): Promise<TradieProfile | null> {
    const profile = await TradieProfile.findByPk(id);
    if (!profile) return null;
    await profile.update(data);
    return profile;
  }

  async findAllApproved(
    filters: WhereOptions<ITradieProfileAttributes>,
    pagination: PaginationOptions,
    categoryId?: string,
    regionId?: string,
    userId?: string,
  ): Promise<PaginatedResult<TradieProfile & { isFavourite: boolean; averageRating: number; totalRatingCount: number }>> {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const include: Includeable[] = [
      { model: User, as: 'user', attributes: ['id', 'name', 'avatar'] },
      {
        model: Category,
        as: 'services',
        through: { attributes: [] },
        attributes: ['id', 'name'],
        ...(categoryId ? { where: { id: categoryId } } : {}),
      },
      {
        model: Region,
        as: 'serviceRegions',
        through: { attributes: [] },
        attributes: ['id', 'name'],
        ...(regionId ? { where: { id: regionId } } : {}),
      },
    ];

    const { count: total, rows } = await TradieProfile.findAndCountAll({
      where: { profileStatus: 'approved', ...filters },
      include,
      order: [['createdAt', 'DESC']],
      offset,
      limit,
      distinct: true,
    });

    // Batch-fetch review stats for all returned profiles
    const profileIds = rows.map((r) => r.id);

    const reviewStats = await Review.findAll({
      where: { tradieProfileId: { [Op.in]: profileIds }, status: 'approved' },
      attributes: [
        'tradieProfileId',
        [fn('COUNT', col('id')), 'totalCount'],
        [fn('AVG', col('rating')), 'avgRating'],
      ],
      group: ['tradieProfileId'],
      raw: true,
    }) as unknown as { tradieProfileId: string; totalCount: string; avgRating: string }[];

    const statsMap = new Map(reviewStats.map((s) => [s.tradieProfileId, s]));

    // Batch-fetch favourites for the current user
    let favouriteSet = new Set<string>();
    if (userId) {
      const favs = await Favourite.findAll({
        where: { customerId: userId, tradieProfileId: { [Op.in]: profileIds } },
        attributes: ['tradieProfileId'],
        raw: true,
      });
      favouriteSet = new Set(favs.map((f) => f.tradieProfileId));
    }

    const data = rows.map((profile) => {
      const stats = statsMap.get(profile.id);
      const totalRatingCount = stats ? parseInt(stats.totalCount, 10) : 0;
      const averageRating = stats ? Math.round(parseFloat(stats.avgRating) * 100) / 100 : 0;
      const isFavourite = favouriteSet.has(profile.id);
      return Object.assign(profile, { isFavourite, averageRating, totalRatingCount });
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  // ── Services (categories) ──

  async setServices(tradieProfileId: string, categoryIds: string[]): Promise<void> {
    await TradieService.destroy({ where: { tradieProfileId } });
    if (categoryIds.length > 0) {
      await TradieService.bulkCreate(categoryIds.map((categoryId) => ({ tradieProfileId, categoryId })));
    }
  }

  // ── Regions ──

  async setRegions(tradieProfileId: string, regionIds: string[]): Promise<void> {
    await TradieRegion.destroy({ where: { tradieProfileId } });
    if (regionIds.length > 0) {
      await TradieRegion.bulkCreate(regionIds.map((regionId) => ({ tradieProfileId, regionId })));
    }
  }

  // ── Work Photos ──

  async getWorkPhotos(tradieProfileId: string): Promise<TradieWorkPhoto[]> {
    return TradieWorkPhoto.findAll({
      where: { tradieProfileId },
      order: [['sortOrder', 'ASC']],
    });
  }

  async countWorkPhotos(tradieProfileId: string): Promise<number> {
    return TradieWorkPhoto.count({ where: { tradieProfileId } });
  }

  async createWorkPhoto(data: { tradieProfileId: string; imageUrl: string; sortOrder?: number }): Promise<TradieWorkPhoto> {
    return TradieWorkPhoto.create(data);
  }

  async deleteWorkPhoto(photoId: string, tradieProfileId: string): Promise<boolean> {
    const deleted = await TradieWorkPhoto.destroy({ where: { id: photoId, tradieProfileId } });
    return deleted > 0;
  }

  // ── Reviews ──

  async getApprovedReviews(tradieProfileId: string, page: number, limit: number): Promise<PaginatedResult<Review>> {
    const offset = (page - 1) * limit;
    const { count: total, rows: data } = await Review.findAndCountAll({
      where: { tradieProfileId, status: 'approved' },
      include: [{ model: User, as: 'customer', attributes: ['id', 'name', 'avatar'] }],
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }
}
