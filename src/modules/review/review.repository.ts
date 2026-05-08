import { Review, TradieProfile, User, IReviewCreationAttributes } from '../../models';
import { PaginatedResult } from '../../common/interfaces';
import { buildPaginationMeta } from '../../common/utils';

export class ReviewRepository {
  async create(data: IReviewCreationAttributes): Promise<Review> {
    return Review.create(data);
  }

  async findByCustomerAndTradie(customerId: string, tradieProfileId: string): Promise<Review | null> {
    return Review.findOne({ where: { customerId, tradieProfileId } });
  }

  async findMyReviews(customerId: string, page: number, limit: number): Promise<PaginatedResult<Review>> {
    const offset = (page - 1) * limit;
    const { count: total, rows: data } = await Review.findAndCountAll({
      where: { customerId },
      include: [
        { model: TradieProfile, attributes: ['id', 'businessName'] },
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }
}
