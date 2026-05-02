import { Request, Response } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { ApiResponse, asyncHandler } from '../../common/utils';
import { AuthenticatedRequest } from '../../common/interfaces';
import { ADMIN_AUTH_MESSAGES } from '../../common/constants';
import { AdminLoginDto, AdminChangePasswordDto } from './admin-auth.interface';

export class AdminAuthController {
  private adminAuthService: AdminAuthService;

  constructor() {
    this.adminAuthService = new AdminAuthService();
  }

  login = asyncHandler(async (req: Request, res: Response) => {
    const dto: AdminLoginDto = req.body;
    const result = await this.adminAuthService.login(dto);
    ApiResponse.success(res, result, ADMIN_AUTH_MESSAGES.LOGIN_SUCCESS);
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const tokens = await this.adminAuthService.refreshToken(refreshToken);
    ApiResponse.success(res, tokens, ADMIN_AUTH_MESSAGES.TOKEN_REFRESHED);
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    await this.adminAuthService.logout(userId);
    ApiResponse.success(res, null, ADMIN_AUTH_MESSAGES.LOGOUT_SUCCESS);
  });

  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const admin = await this.adminAuthService.getProfile(userId);
    ApiResponse.success(res, admin, ADMIN_AUTH_MESSAGES.PROFILE_FETCHED);
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const dto: AdminChangePasswordDto = req.body;
    await this.adminAuthService.changePassword(userId, dto);
    ApiResponse.success(res, null, ADMIN_AUTH_MESSAGES.PASSWORD_CHANGED);
  });
}
