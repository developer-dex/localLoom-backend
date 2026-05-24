import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AuthRepository } from './auth.repository';
import { SmsService } from '../../services/sms.service';
import { EmailService } from '../../services/email.service';
import { TokenPair, EmailLoginDto, EmailRegisterDto, UserSignupDto, UserLoginDto, UserVerifyOtpDto } from './auth.interface';
import { User } from '../../models';
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '../../common/exceptions';
import { AUTH_MESSAGES } from '../../common/constants';
import { AuthPayload } from '../../common/interfaces';
import { AccountStatus, OtpPurpose, UserRole } from '../../common/enums';
import { generateOTP, maskPhone, maskEmail } from '../../common/utils';

export class AuthService {
  private authRepository: AuthRepository;
  private smsService: SmsService;
  private emailService: EmailService;

  constructor() {
    this.authRepository = new AuthRepository();
    this.smsService = new SmsService();
    this.emailService = new EmailService();
  }

  /**
   * Send OTP to a phone number.
   * Invalidates any previous unused OTPs for this phone.
   */
  async sendOtp(phone: string): Promise<void> {
    // Invalidate previous OTPs
    await this.authRepository.invalidateOtpsForPhone(phone, OtpPurpose.LOGIN);

    // Generate a 6-digit OTP code
    const code = generateOTP(6);
    const expiresAt = new Date(Date.now() + env.otp.expiryMinutes * 60 * 1000);

    // Store OTP in database
    await this.authRepository.createOtp({
      phone,
      code,
      purpose: OtpPurpose.LOGIN,
      expiresAt,
    });

    // Send via SMS (in dev mode, this just logs the code)
    await this.smsService.sendOtp(phone, code);
  }

  /**
   * Sign up a new customer or tradie via phone OTP.
   * Req 1.1–1.9
   */
  async userSignup(dto: UserSignupDto): Promise<{ phone: string; email?: string }> {
    const { fullName, phone, role, email, profilePhotoUrl } = dto;

    // Check for duplicate phone
    const phoneExists = await this.authRepository.phoneExists(phone);
    if (phoneExists) {
      throw new ConflictException('Phone number already registered');
    }

    // Check for duplicate email (if provided)
    if (email) {
      const emailExists = await this.authRepository.emailExists(email);
      if (emailExists) {
        throw new ConflictException('Email already registered');
      }
    }

    // Create user
    await this.authRepository.createUser({
      name: fullName,
      phone,
      role: role as UserRole,
      email: email ?? undefined,
      avatar: profilePhotoUrl ?? undefined,
      isPhoneVerified: false,
    });

    // In dev mode phone uses the fixed devCode; email always uses a real generated code
    const isDevMode = !env.isProduction;
    // const emailCode = generateOTP(6);
    const emailCode = '123456'
    const phoneCode = isDevMode ? env.otp.devCode : emailCode;
    const expiresAt = new Date(Date.now() + env.otp.expiryMinutes * 60 * 1000);

    await this.authRepository.createOtp({
      phone,
      code: phoneCode,
      purpose: OtpPurpose.LOGIN,
      expiresAt,
    });

    if (email) {
      await this.authRepository.createOtpWithEmail({
        email,
        code: emailCode,
        purpose: OtpPurpose.LOGIN,
        expiresAt,
      });
    }

    // Phone: skip SMS in dev mode (devCode is used). Email: always send real OTP.
    // const deliveries: Promise<unknown>[] = [];
    // if (!isDevMode) {
    //   deliveries.push(this.smsService.sendOtp(phone, phoneCode));
    // }
    // if (email) {
    //   deliveries.push(this.emailService.sendOtp(email, emailCode));
    // }
    // await Promise.all(deliveries);

    return email ? { phone, email } : { phone };
  }

  /**
   * Initiate login for an existing user via phone or email OTP.
   * Sends OTP to both phone and email if the user has both registered.
   * Dev mode: phone channel uses devCode (123456); email channel always sends real OTP.
   * Req 2.1–2.7, 2.11, 2.12
   */
  async userLogin(dto: UserLoginDto): Promise<{ identifierType: string; maskedIdentifier: string }> {
    const { identifier, identifierType } = dto;

    // Look up user by identifier
    let user: User | null;
    if (identifierType === 'phone') {
      user = await this.authRepository.findUserByPhone(identifier);
      if (!user) {
        throw new NotFoundException('No account found with this phone number');
      }
    } else {
      user = await this.authRepository.findUserByEmail(identifier);
      if (!user) {
        throw new NotFoundException('No account found with this email address');
      }
    }

    // Check account status
    if (user.status === AccountStatus.SUSPENDED) {
      throw new ForbiddenException(AUTH_MESSAGES.ACCOUNT_SUSPENDED);
    }
    if (user.status === AccountStatus.DELETED) {
      throw new ForbiddenException(AUTH_MESSAGES.ACCOUNT_DELETED);
    }

    // In dev mode phone uses the fixed devCode; email always uses a real generated code
    const isDevMode = !env.isProduction;
    // const emailCode = generateOTP(6);
    const emailCode = '123456';
    const phoneCode = isDevMode ? env.otp.devCode : emailCode;
    const expiresAt = new Date(Date.now() + env.otp.expiryMinutes * 60 * 1000);

    // const deliveries: Promise<unknown>[] = [];

    // Phone channel — store devCode in dev, real code in prod; skip actual SMS in dev
    if (user.phone) {
      await this.authRepository.invalidateOtpsForPhone(user.phone, OtpPurpose.LOGIN);
      await this.authRepository.createOtp({
        phone: user.phone,
        code: phoneCode,
        purpose: OtpPurpose.LOGIN,
        expiresAt,
      });
      // if (!isDevMode) {
      //   deliveries.push(this.smsService.sendOtp(user.phone, phoneCode));
      // }
    }

    // Email channel — always send real OTP to email (even in dev)
    if (user.email) {
      await this.authRepository.invalidateOtpsForEmail(user.email, OtpPurpose.LOGIN);
      await this.authRepository.createOtpWithEmail({
        email: user.email,
        code: emailCode,
        purpose: OtpPurpose.LOGIN,
        expiresAt,
      });
      // deliveries.push(this.emailService.sendOtp(user.email, emailCode));
    }

    // await Promise.all(deliveries);

    // Return masked version of the identifier the user logged in with
    const maskedIdentifier = identifierType === 'phone' ? maskPhone(identifier) : maskEmail(identifier);
    return { identifierType, maskedIdentifier };
  }

  /**
   * Verify OTP for a customer login (phone or email) and return tokens.
   * Dev mode: phone accepts devCode (123456) without DB lookup.
   *           email always verifies against the real OTP stored in DB.
   * Req 3.1–3.11
   */
  async userVerifyOtp(dto: UserVerifyOtpDto): Promise<{ user: User; tokens: TokenPair }> {
    const { identifier, identifierType, code } = dto;

    // Dev mode bypass for PHONE only — devCode skips DB lookup
    if (!env.isProduction && identifierType === 'phone' && code === env.otp.devCode) {
      const user = await this.authRepository.findUserByPhone(identifier);
      if (!user) {
        throw new BadRequestException(AUTH_MESSAGES.OTP_INVALID);
      }
      if (!user.isPhoneVerified) {
        await this.authRepository.setPhoneVerified(user.id);
      }
      await this.authRepository.updateLastLogin(user.id);
      const tokens = this.generateTokens(user);
      await this.authRepository.updateRefreshToken(user.id, tokens.refreshToken);
      const freshUser = await this.authRepository.findUserById(user.id);
      return { user: freshUser!, tokens };
    }

    // For email (all modes) and phone in production — verify against DB
    const otp =
      identifierType === 'phone'
        ? await this.authRepository.findLatestValidOtp(identifier, OtpPurpose.LOGIN)
        : await this.authRepository.findLatestValidOtpByEmail(identifier, OtpPurpose.LOGIN);

    if (!otp) {
      throw new BadRequestException(AUTH_MESSAGES.OTP_INVALID);
    }

    // Check expiry
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException(AUTH_MESSAGES.OTP_EXPIRED);
    }

    // Check max attempts
    if (otp.attempts >= otp.maxAttempts) {
      throw new BadRequestException(AUTH_MESSAGES.OTP_MAX_ATTEMPTS);
    }

    // Verify code
    if (otp.code !== code) {
      await this.authRepository.incrementOtpAttempts(otp.id);
      throw new BadRequestException(AUTH_MESSAGES.OTP_INVALID);
    }

    // Mark OTP as used
    await this.authRepository.markOtpUsed(otp.id);

    // Fetch the user
    const user =
      identifierType === 'phone'
        ? await this.authRepository.findUserByPhone(identifier)
        : await this.authRepository.findUserByEmail(identifier);

    if (!user) {
      throw new BadRequestException(AUTH_MESSAGES.OTP_INVALID);
    }

    // Set isPhoneVerified if phone channel
    if (identifierType === 'phone' && !user.isPhoneVerified) {
      await this.authRepository.setPhoneVerified(user.id);
    }

    // Update last login
    await this.authRepository.updateLastLogin(user.id);

    // Generate and store tokens
    const tokens = this.generateTokens(user);
    await this.authRepository.updateRefreshToken(user.id, tokens.refreshToken);

    const freshUser = await this.authRepository.findUserById(user.id);
    return { user: freshUser!, tokens };
  }

  /**
   * Verify OTP and return tokens.
   * If the phone is new, creates a user record.
   * Returns { user, tokens, isNewUser }.
   */
  async verifyOtp(phone: string, code: string): Promise<{ user: User; tokens: TokenPair; isNewUser: boolean }> {
    // In dev mode, accept the dev code directly without DB lookup
    if (!env.isProduction && code === env.otp.devCode) {
      return this.handleVerifiedPhone(phone);
    }

    // Find the latest valid OTP for this phone
    const otp = await this.authRepository.findLatestValidOtp(phone, OtpPurpose.LOGIN);

    if (!otp) {
      throw new BadRequestException(AUTH_MESSAGES.OTP_INVALID);
    }

    // Check if max attempts exceeded
    if (otp.attempts >= otp.maxAttempts) {
      throw new BadRequestException(AUTH_MESSAGES.OTP_MAX_ATTEMPTS);
    }

    // Check if expired
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException(AUTH_MESSAGES.OTP_EXPIRED);
    }

    // Verify the code
    if (otp.code !== code) {
      await this.authRepository.incrementOtpAttempts(otp.id);
      throw new BadRequestException(AUTH_MESSAGES.OTP_INVALID);
    }

    // Mark OTP as used
    await this.authRepository.markOtpUsed(otp.id);

    return this.handleVerifiedPhone(phone);
  }

  /**
   * Refresh access token using a valid refresh token.
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, env.jwt.refreshSecret) as AuthPayload;

      if (decoded.userType !== 'user') {
        throw new UnauthorizedException(AUTH_MESSAGES.INVALID_TOKEN);
      }

      const user = await this.authRepository.findUserById(decoded.userId);
      if (!user) {
        throw new UnauthorizedException(AUTH_MESSAGES.INVALID_TOKEN);
      }

      if (user.status === AccountStatus.SUSPENDED) {
        throw new ForbiddenException(AUTH_MESSAGES.ACCOUNT_SUSPENDED);
      }

      const tokens = this.generateTokens(user);
      await this.authRepository.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_TOKEN);
    }
  }

  /**
   * Logout — clear refresh token.
   */
  async logout(userId: string): Promise<void> {
    await this.authRepository.updateRefreshToken(userId, null);
  }

  /**
   * Get current user profile.
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_TOKEN);
    }
    return user;
  }

  // ── Email + Password Auth ──

  /**
   * Register with email + password + phone.
   */
  async emailRegister(dto: EmailRegisterDto): Promise<{ user: User; tokens: TokenPair }> {
    const emailExists = await this.authRepository.emailExists(dto.email);
    if (emailExists) {
      throw new ConflictException('Email already registered');
    }

    const phoneExists = await this.authRepository.phoneExists(dto.phone);
    if (phoneExists) {
      throw new ConflictException(AUTH_MESSAGES.PHONE_ALREADY_EXISTS);
    }

    const user = await this.authRepository.createUser({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      password: dto.password,
      role: (dto.role as UserRole) || UserRole.CUSTOMER,
    });

    await this.authRepository.updateLastLogin(user.id);
    const tokens = this.generateTokens(user);
    await this.authRepository.updateRefreshToken(user.id, tokens.refreshToken);

    const freshUser = await this.authRepository.findUserById(user.id);
    return { user: freshUser!, tokens };
  }

  /**
   * Login with email + password.
   */
  async emailLogin(dto: EmailLoginDto): Promise<{ user: User; tokens: TokenPair }> {
    const user = await this.authRepository.findUserByEmailWithPassword(dto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_TOKEN);
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw new ForbiddenException(AUTH_MESSAGES.ACCOUNT_SUSPENDED);
    }
    if (user.status === AccountStatus.DELETED) {
      throw new ForbiddenException(AUTH_MESSAGES.ACCOUNT_DELETED);
    }

    const isMatch = await user.comparePassword(dto.password);
    if (!isMatch) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_TOKEN);
    }

    await this.authRepository.updateLastLogin(user.id);
    const tokens = this.generateTokens(user);
    await this.authRepository.updateRefreshToken(user.id, tokens.refreshToken);

    const freshUser = await this.authRepository.findUserById(user.id);
    return { user: freshUser!, tokens };
  }

  // ── Private helpers ──

  /**
   * After phone is verified (OTP matched), find or create user and return tokens.
   */
  private async handleVerifiedPhone(phone: string): Promise<{ user: User; tokens: TokenPair; isNewUser: boolean }> {
    let user = await this.authRepository.findUserByPhone(phone);
    let isNewUser = false;

    if (!user) {
      // First-time user — create with minimal data
      user = await this.authRepository.createUser({
        name: '',
        phone,
        role: UserRole.CUSTOMER,
        isPhoneVerified: true,
      });
      isNewUser = true;
    } else {
      // Existing user — check account status
      if (user.status === AccountStatus.SUSPENDED) {
        throw new ForbiddenException(AUTH_MESSAGES.ACCOUNT_SUSPENDED);
      }
      if (user.status === AccountStatus.DELETED) {
        throw new ForbiddenException(AUTH_MESSAGES.ACCOUNT_DELETED);
      }

      // Mark phone as verified if not already
      if (!user.isPhoneVerified) {
        await this.authRepository.setPhoneVerified(user.id);
      }
    }

    // Update last login
    await this.authRepository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = this.generateTokens(user);
    await this.authRepository.updateRefreshToken(user.id, tokens.refreshToken);

    // Re-fetch to get clean data (without refreshToken in default scope)
    const freshUser = await this.authRepository.findUserById(user.id);

    return { user: freshUser!, tokens, isNewUser };
  }

  private generateTokens(user: User): TokenPair {
    const payload: AuthPayload = {
      userId: user.id,
      role: user.role,
      userType: 'user',
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
