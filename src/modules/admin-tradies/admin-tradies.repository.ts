import { Op } from 'sequelize';
import { TradieProfile, User, Category, Region, TradieWorkPhoto } from '../../models';
import { PaginatedResult } from '../../common/interfaces';
import { buildPaginationMeta } from '../../common/utils';

export interface TradieListOptions {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

export class AdminTradiesRepository {
  async findAll(options: TradieListOptions): Promise<PaginatedResult<TradieProfile>> {
    const { page, limit, status, search } = options;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.profileStatus = status;
    }

    if (search) {
      where[Op.or as unknown as string] = [
        { businessName: { [Op.iLike]: `%${search}%` } },
        { abn: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count: total, rows: data } = await TradieProfile.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'avatar'] },
        { model: Category, as: 'services', through: { attributes: [] }, attributes: ['id', 'name'] },
        { model: Region, as: 'serviceRegions', through: { attributes: [] }, attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit,
      distinct: true,
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string): Promise<TradieProfile | null> {
    return TradieProfile.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'avatar'] },
        { model: Category, as: 'services', through: { attributes: [] } },
        { model: Region, as: 'serviceRegions', through: { attributes: [] } },
        { model: TradieWorkPhoto, as: 'workPhotos' },
      ],
    });
  }

  async updateStatus(id: string, status: string, rejectionReason?: string): Promise<TradieProfile | null> {
    const profile = await TradieProfile.findByPk(id);
    if (!profile) return null;
    await profile.update({ profileStatus: status, rejectionReason: rejectionReason ?? null });
    return profile;
  }
}
