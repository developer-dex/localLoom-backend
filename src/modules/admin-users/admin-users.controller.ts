import { Request, Response } from 'express';
import { AdminUsersService } from './admin-users.service';
import { ApiResponse, asyncHandler, parsePaginationQuery } from '../../common/utils';
import { USER_MESSAGES } from '../../common/constants';

export class AdminUsersController {
  private service: AdminUsersService;

  constructor() {
    this.service = new AdminUsersService();
  }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationQuery(req.query);
    const { status, role, search } = req.query as { status?: string; role?: string; search?: string };

    const result = await this.service.list({ page, limit, status, role, search });
    ApiResponse.paginated(res, result.data, result.meta, USER_MESSAGES.LIST_FETCHED);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.service.getById(req.params.id);
    ApiResponse.success(res, user, USER_MESSAGES.FETCHED);
  });

  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.service.deleteUser(req.params.id);
    ApiResponse.success(res, { id: user.id }, USER_MESSAGES.DELETED);
  });
}
