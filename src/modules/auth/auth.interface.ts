export interface SendOtpDto {
  phone: string;
}

export interface VerifyOtpDto {
  phone: string;
  code: string;
}

export interface UserSignupDto {
  fullName: string;
  phone: string;
  role: 'customer' | 'tradie';
  email?: string;
  profilePhotoUrl?: string; // resolved by controller from multer upload
}

export interface UserLoginDto {
  identifier: string;
  identifierType: 'phone' | 'email';
}

export interface UserVerifyOtpDto {
  identifier: string;
  identifierType: 'phone' | 'email';
  code: string;
}

export interface EmailLoginDto {
  email: string;
  password: string;
}

export interface EmailRegisterDto {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}
