import { Request, Response } from 'express';
import { AdminHelpDeskService } from './admin-help-desk.service';
import { ApiResponse, asyncHandler, parsePaginationQuery } from '../../common/utils';

export class AdminHelpDeskController {
  private service: AdminHelpDeskService;

  constructor() {
    this.service = new AdminHelpDeskService();
  }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationQuery(req.query);
    const { status } = req.query as { status?: string };
    const result = await this.service.list({ page, limit, status });
    ApiResponse.paginated(res, result.data, result.meta, 'Help desk requests fetched');
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const request = await this.service.getById(req.params.id);
    ApiResponse.success(res, request, 'Help desk request fetched');
  });

  resolve = asyncHandler(async (req: Request, res: Response) => {
    const request = await this.service.resolve(req.params.id);
    ApiResponse.success(res, request, 'Help desk request resolved');
  });
}
