import { Request, Response } from 'express';
import { ReviewService } from './review.service';
import { ApiResponse, asyncHandler, parsePaginationQuery } from '../../common/utils';
import { AuthenticatedRequest } from '../../common/interfaces';
import { REVIEW_MESSAGES } from '../../common/constants';
import { CreateReviewDto } from './review.interface';

export class ReviewController {
  private reviewService: ReviewService;

  constructor() {
    this.reviewService = new ReviewService();
  }

  create = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = (req as AuthenticatedRequest).user;
    const dto: CreateReviewDto = req.body;
    const review = await this.reviewService.createReview(userId, role, dto);
    ApiResponse.created(res, review, REVIEW_MESSAGES.CREATED);
  });

  getMyReviews = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { page, limit } = parsePaginationQuery(req.query);
    const result = await this.reviewService.getMyReviews(userId, page, limit);
    ApiResponse.paginated(res, result.data, result.meta, REVIEW_MESSAGES.LIST_FETCHED);
  });
}
