import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AdminAuthRepository } from './admin-auth.repository';
import { AdminLoginDto, AdminChangePasswordDto, AdminTokenPair } from './admin-auth.interface';
import { Admin } from '../../models';
import {
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '../../common/exceptions';
import { ADMIN_AUTH_MESSAGES } from '../../common/constants';
import { AuthPayload } from '../../common/interfaces';
import { AccountStatus } from '../../common/enums';

export class AdminAuthService {
  private adminAuthRepository: AdminAuthRepository;

  constructor() {
    this.adminAuthRepository = new AdminAuthRepository();
  }

  async login(dto: AdminLoginDto): Promise<{ admin: Admin; tokens: AdminTokenPair }> {
    const admin = await this.adminAuthRepository.findByEmailWithToken(dto.email);
    if (!admin) {
      throw new UnauthorizedException(ADMIN_AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    if (admin.status !== AccountStatus.ACTIVE) {
      throw new ForbiddenException('Admin account is not active');
    }

    const isMatch = await admin.comparePassword(dto.password);
    if (!isMatch) {
      throw new UnauthorizedException(ADMIN_AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const tokens = this.generateTokens(admin);

    await this.adminAuthRepository.updateRefreshToken(admin.id, tokens.refreshToken);
    await this.adminAuthRepository.updateLastLogin(admin.id);

    // Re-fetch without password/refreshToken
    const safeAdmin = await this.adminAuthRepository.findById(admin.id);

    return { admin: safeAdmin!, tokens };
  }

  async refreshToken(refreshToken: string): Promise<AdminTokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, env.jwt.refreshSecret) as AuthPayload;

      if (decoded.userType !== 'admin') {
        throw new UnauthorizedException(ADMIN_AUTH_MESSAGES.INVALID_TOKEN);
      }

      const admin = await this.adminAuthRepository.findById(decoded.userId);
      if (!admin) {
        throw new UnauthorizedException(ADMIN_AUTH_MESSAGES.INVALID_TOKEN);
      }

      if (admin.status !== AccountStatus.ACTIVE) {
        throw new ForbiddenException('Admin account is not active');
      }

      const tokens = this.generateTokens(admin);
      await this.adminAuthRepository.updateRefreshToken(admin.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException(ADMIN_AUTH_MESSAGES.INVALID_TOKEN);
    }
  }

  async logout(adminId: string): Promise<void> {
    await this.adminAuthRepository.updateRefreshToken(adminId, null);
  }

  async getProfile(adminId: string): Promise<Admin> {
    const admin = await this.adminAuthRepository.findById(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    return admin;
  }

  async changePassword(adminId: string, dto: AdminChangePasswordDto): Promise<void> {
    const admin = await this.adminAuthRepository.findByIdWithPassword(adminId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const isMatch = await admin.comparePassword(dto.currentPassword);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    admin.password = dto.newPassword;
    await admin.save();
  }

  private generateTokens(admin: Admin): AdminTokenPair {
    const payload: AuthPayload = {
      userId: admin.id,
      role: admin.role,
      userType: 'admin',
    };

    const accessOpts: SignOptions = {
      expiresIn: env.jwt.accessExpiry as SignOptions['expiresIn'],
    };
    const refreshOpts: SignOptions = {
      expiresIn: env.jwt.refreshExpiry as SignOptions['expiresIn'],
    };

    const accessToken = jwt.sign(payload, env.jwt.accessSecret, accessOpts);
    const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, refreshOpts);

    return { accessToken, refreshToken };
  }
}
