import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse, asyncHandler } from '../../common/utils';
import { AuthenticatedRequest } from '../../common/interfaces';
import { AUTH_MESSAGES } from '../../common/constants';
import { SendOtpDto, VerifyOtpDto, EmailLoginDto, EmailRegisterDto, UserSignupDto, UserLoginDto, UserVerifyOtpDto } from './auth.interface';
import { getFileUrl } from '../../services/file-upload.service';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // ── Customer Auth ──

  userSignup = asyncHandler(async (req: Request, res: Response) => {
    const dto: UserSignupDto = req.body;
    if (req.file) {
      dto.profilePhotoUrl = getFileUrl('businessDetails', req.file.filename);
    }
    const result = await this.authService.userSignup(dto);
    ApiResponse.created(res, result, 'Signup successful. OTP sent to your phone.');
  });

  userLogin = asyncHandler(async (req: Request, res: Response) => {
    const dto: UserLoginDto = req.body;
    const result = await this.authService.userLogin(dto);
    ApiResponse.success(res, result, 'OTP sent successfully');
  });

  userVerifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const dto: UserVerifyOtpDto = req.body;
    const result = await this.authService.userVerifyOtp(dto);
    ApiResponse.success(res, result, AUTH_MESSAGES.LOGIN_SUCCESS);
  });

  // ── Phone + OTP ──

  sendOtp = asyncHandler(async (req: Request, res: Response) => {
    const { phone }: SendOtpDto = req.body;
    await this.authService.sendOtp(phone);
    ApiResponse.success(res, { phone }, AUTH_MESSAGES.OTP_SENT);
  });

  verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const { phone, code }: VerifyOtpDto = req.body;
    const result = await this.authService.verifyOtp(phone, code);
    ApiResponse.success(res, result, AUTH_MESSAGES.LOGIN_SUCCESS);
  });

  // ── Email + Password ──

  emailRegister = asyncHandler(async (req: Request, res: Response) => {
    const dto: EmailRegisterDto = req.body;
    const result = await this.authService.emailRegister(dto);
    ApiResponse.created(res, result, 'Registration successful');
  });

  emailLogin = asyncHandler(async (req: Request, res: Response) => {
    const dto: EmailLoginDto = req.body;
    const result = await this.authService.emailLogin(dto);
    ApiResponse.success(res, result, AUTH_MESSAGES.LOGIN_SUCCESS);
  });

  // ── Common ──

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const tokens = await this.authService.refreshToken(refreshToken);
    ApiResponse.success(res, tokens, AUTH_MESSAGES.TOKEN_REFRESHED);
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    await this.authService.logout(userId);
    ApiResponse.success(res, null, AUTH_MESSAGES.LOGOUT_SUCCESS);
  });

  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const user = await this.authService.getProfile(userId);
    ApiResponse.success(res, user, AUTH_MESSAGES.PROFILE_FETCHED);
  });
}
