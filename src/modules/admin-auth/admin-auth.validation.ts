import Joi from 'joi';

export const adminLoginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

export const adminChangePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

export const adminRefreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});
