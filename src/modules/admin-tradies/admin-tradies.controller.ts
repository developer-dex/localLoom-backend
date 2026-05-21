import { Request, Response } from 'express';
import { AdminTradiesService } from './admin-tradies.service';
import { ApiResponse, asyncHandler, parsePaginationQuery } from '../../common/utils';
import { TRADIE_MESSAGES } from '../../common/constants';

export class AdminTradiesController {
  private service: AdminTradiesService;

  constructor() {
    this.service = new AdminTradiesService();
  }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationQuery(req.query);
    const { status, search } = req.query as { status?: string; search?: string };

    const result = await this.service.list({ page, limit, status, search });
    ApiResponse.paginated(res, result.data, result.meta, TRADIE_MESSAGES.LIST_FETCHED);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const profile = await this.service.getById(req.params.id);
    ApiResponse.success(res, profile, TRADIE_MESSAGES.PROFILE_FETCHED);
  });

  approve = asyncHandler(async (req: Request, res: Response) => {
    const profile = await this.service.approve(req.params.id);
    ApiResponse.success(res, profile, TRADIE_MESSAGES.APPROVED);
  });

  reject = asyncHandler(async (req: Request, res: Response) => {
    const { rejectionReason } = req.body;
    const profile = await this.service.reject(req.params.id, rejectionReason);
    ApiResponse.success(res, profile, TRADIE_MESSAGES.REJECTED);
  });

  bulkApprove = asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    const result = await this.service.bulkApprove(ids);
    ApiResponse.success(res, result, TRADIE_MESSAGES.APPROVED);
  });

  bulkReject = asyncHandler(async (req: Request, res: Response) => {
    const { ids, rejectionReason } = req.body;
    const result = await this.service.bulkReject(ids, rejectionReason);
    ApiResponse.success(res, result, TRADIE_MESSAGES.REJECTED);
  });
}
