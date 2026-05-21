import { Op } from 'sequelize';
import { Review, User, TradieProfile } from '../../models';
import { PaginatedResult } from '../../common/interfaces';
import { buildPaginationMeta } from '../../common/utils';

export interface ReviewListOptions {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

export interface UpdateReviewStatusData {
  status: string;
  rejectionReason?: string | null;
  reviewedByAdmin: string;
  reviewedAt: Date;
}

export class AdminReviewsRepository {
  async findAll(options: ReviewListOptions): Promise<PaginatedResult<Review>> {
    const { page, limit, status, search } = options;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    const include = [
      { model: User, as: 'customer', attributes: ['id', 'name'] },
      { model: TradieProfile, foreignKey: 'tradieProfileId', attributes: ['id', 'businessName'] },
    ];

    if (search) {
      where[Op.or as unknown as string] = [
        { '$customer.name$': { [Op.iLike]: `%${search}%` } },
        { '$TradieProfile.business_name$': { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count: total, rows: data } = await Review.findAndCountAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      offset,
      limit,
      distinct: true,
      subQuery: false,
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string): Promise<Review | null> {
    return Review.findByPk(id, {
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'avatar'] },
        { model: TradieProfile, foreignKey: 'tradieProfileId', attributes: ['id', 'businessName'] },
      ],
    });
  }

  async updateStatus(id: string, data: UpdateReviewStatusData): Promise<Review | null> {
    const review = await Review.findByPk(id);
    if (!review) return null;
    await review.update({
      status: data.status,
      rejectionReason: data.rejectionReason ?? null,
      reviewedByAdmin: data.reviewedByAdmin,
      reviewedAt: data.reviewedAt,
    });
    return review;
  }
}
