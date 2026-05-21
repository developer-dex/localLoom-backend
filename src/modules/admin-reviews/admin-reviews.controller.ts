import { Request, Response } from 'express';
import { AdminReviewsService } from './admin-reviews.service';
import { ApiResponse, asyncHandler, parsePaginationQuery } from '../../common/utils';
import { AuthenticatedRequest } from '../../common/interfaces';
import { REVIEW_MESSAGES } from '../../common/constants';

export class AdminReviewsController {
  private service: AdminReviewsService;

  constructor() {
    this.service = new AdminReviewsService();
  }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationQuery(req.query);
    const { status, search } = req.query as { status?: string; search?: string };

    const result = await this.service.list({ page, limit, status, search });
    ApiResponse.paginated(res, result.data, result.meta, REVIEW_MESSAGES.LIST_FETCHED);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const review = await this.service.getById(req.params.id);
    ApiResponse.success(res, review, REVIEW_MESSAGES.FETCHED);
  });

  approve = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as AuthenticatedRequest).user.userId;
    const review = await this.service.approve(req.params.id, adminId);
    ApiResponse.success(res, review, REVIEW_MESSAGES.APPROVED);
  });

  reject = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as AuthenticatedRequest).user.userId;
    const { rejectionReason } = req.body;
    const review = await this.service.reject(req.params.id, rejectionReason, adminId);
    ApiResponse.success(res, review, REVIEW_MESSAGES.REJECTED);
  });

  bulkApprove = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as AuthenticatedRequest).user.userId;
    const { ids } = req.body;
    const result = await this.service.bulkApprove(ids, adminId);
    ApiResponse.success(res, result, REVIEW_MESSAGES.APPROVED);
  });

  bulkReject = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as AuthenticatedRequest).user.userId;
    const { ids, rejectionReason } = req.body;
    const result = await this.service.bulkReject(ids, rejectionReason, adminId);
    ApiResponse.success(res, result, REVIEW_MESSAGES.REJECTED);
  });
}
