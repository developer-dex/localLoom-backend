import { Request, Response } from 'express';
import { UserService } from './user.service';
import { ApiResponse, asyncHandler } from '../../common/utils';
import { AuthenticatedRequest } from '../../common/interfaces';
import { USER_MESSAGES } from '../../common/constants';
import { UpdateUserDto } from './user.interface';
import { env } from '../../config/env';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getMe = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const user = await this.userService.getMe(userId);
    const data = {
      ...user.toJSON(),
      avatar: user.avatar ? `${env.backendBaseUrl}${user.avatar}` : null,
      profile_setup: user.profile_setup,
      is_tradie: user.is_tradie,
      is_customer: user.is_customer,
      tradie_profile_status: user.tradie_profile_status,
    };
    ApiResponse.success(res, data, USER_MESSAGES.FETCHED);
  });

  updateMe = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const dto: UpdateUserDto = req.body;
    const user = await this.userService.updateMe(userId, dto);
    ApiResponse.success(res, user, USER_MESSAGES.UPDATED);
  });

  updateAvatar = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    if (!req.file) {
      return ApiResponse.error(res, 'Avatar file is required', 400);
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await this.userService.updateAvatar(userId, avatarUrl);
    ApiResponse.success(res, user, USER_MESSAGES.UPDATED);
  });

  deleteMe = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    await this.userService.deleteMe(userId);
    ApiResponse.success(res, null, USER_MESSAGES.DELETED);
  });
}
