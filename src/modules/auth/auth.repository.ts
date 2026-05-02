import { Op } from 'sequelize';
import { User, OtpCode } from '../../models';
import type { IUserCreationAttributes } from '../../models';

export class AuthRepository {
  // ── User queries ── 

  async findUserByPhone(phone: string): Promise<User | null> {
    return User.findOne({ where: { phone } });
  }

  async findUserByPhoneWithToken(phone: string): Promise<User | null> {
    return User.scope('withRefreshToken').findOne({ where: { phone } });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return User.findOne({ where: { email } });
  }

  async findUserByEmailWithPassword(email: string): Promise<User | null> {
    return User.scope('withPassword').findOne({ where: { email } });
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await User.count({ where: { email } });
    return count > 0;
  }

  async phoneExists(phone: string): Promise<boolean> {
    const count = await User.count({ where: { phone } });
    return count > 0;
  }

  async findUserById(id: string): Promise<User | null> {
    return User.findByPk(id);
  }

  async findUserByIdWithToken(id: string): Promise<User | null> {
    return User.scope('withRefreshToken').findByPk(id);
  }

  async createUser(data: IUserCreationAttributes): Promise<User> {
    const user = await User.create(data);
    return (await User.findByPk(user.id))!;
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await User.update({ refreshToken }, { where: { id: userId } });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await User.update({ lastLogin: new Date() }, { where: { id: userId } });
  }

  async setPhoneVerified(userId: string): Promise<void> {
    await User.update({ isPhoneVerified: true }, { where: { id: userId } });
  }

  // ── OTP queries ──

  async createOtp(data: { phone: string; code: string; purpose: string; expiresAt: Date }): Promise<OtpCode> {
    return OtpCode.create(data);
  }

  async findLatestValidOtp(phone: string, purpose: string): Promise<OtpCode | null> {
    return OtpCode.findOne({
      where: {
        phone,
        purpose,
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
    });
  }

  async incrementOtpAttempts(otpId: string): Promise<void> {
    await OtpCode.increment('attempts', { where: { id: otpId } });
  }

  async markOtpUsed(otpId: string): Promise<void> {
    await OtpCode.update({ isUsed: true }, { where: { id: otpId } });
  }

  async invalidateOtpsForPhone(phone: string, purpose: string): Promise<void> {
    await OtpCode.update(
      { isUsed: true },
      { where: { phone, purpose, isUsed: false } },
    );
  }

  async createOtpWithEmail(data: { email: string; code: string; purpose: string; expiresAt: Date }): Promise<OtpCode> {
    return OtpCode.create({ ...data, phone: null });
  }

  async findLatestValidOtpByEmail(email: string, purpose: string): Promise<OtpCode | null> {
    return OtpCode.findOne({
      where: {
        email,
        purpose,
        isUsed: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
    });
  }

  async invalidateOtpsForEmail(email: string, purpose: string): Promise<void> {
    await OtpCode.update(
      { isUsed: true },
      { where: { email, purpose, isUsed: false } },
    );
  }
}
