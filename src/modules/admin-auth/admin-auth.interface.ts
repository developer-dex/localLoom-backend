export interface AdminLoginDto {
  email: string;
  password: string;
}

export interface AdminChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface AdminTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AdminRefreshTokenDto {
  refreshToken: string;
}
