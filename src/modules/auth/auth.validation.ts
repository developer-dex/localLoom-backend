import Joi from 'joi';

// Phone must be E.164 format (e.g., +61412345678)
export const sendOtpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{6,14}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone must be in E.164 format (e.g., +61412345678)' }),
});

export const verifyOtpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{6,14}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone must be in E.164 format (e.g., +61412345678)' }),
  code: Joi.string().length(6).required(),
});

// Email + password login (alternative to OTP)
export const emailLoginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

// Register with email + password + phone
export const emailRegisterSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{6,14}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone must be in E.164 format (e.g., +61412345678)' }),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('customer', 'tradie').optional().default('customer'),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const e164Pattern = /^\+[1-9]\d{6,14}$/;

export const userSignupSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string()
    .pattern(e164Pattern)
    .required()
    .messages({ 'string.pattern.base': 'Phone must be in E.164 format (e.g., +61412345678)' }),
  role: Joi.string().valid('customer', 'tradie').required(),
  email: Joi.string().email().lowercase().trim().optional(),
});

export const userLoginSchema = Joi.object({
  identifier: Joi.string().required(),
  identifierType: Joi.string().valid('phone', 'email').required(),
}).when(Joi.object({ identifierType: Joi.valid('phone') }).unknown(), {
  then: Joi.object({
    identifier: Joi.string()
      .pattern(e164Pattern)
      .required()
      .messages({ 'string.pattern.base': 'Phone must be in E.164 format (e.g., +61412345678)' }),
  }),
}).when(Joi.object({ identifierType: Joi.valid('email') }).unknown(), {
  then: Joi.object({
    identifier: Joi.string().email().required(),
  }),
});

export const userVerifyOtpSchema = Joi.object({
  identifier: Joi.string().required(),
  identifierType: Joi.string().valid('phone', 'email').required(),
  code: Joi.string().length(6).required(),
});

export const resendOtpSchema = Joi.object({
  identifier: Joi.string().required(),
  identifierType: Joi.string().valid('phone', 'email').required(),
}).when(Joi.object({ identifierType: Joi.valid('phone') }).unknown(), {
  then: Joi.object({
    identifier: Joi.string()
      .pattern(e164Pattern)
      .required()
      .messages({ 'string.pattern.base': 'Phone must be in E.164 format (e.g., +61412345678)' }),
  }),
}).when(Joi.object({ identifierType: Joi.valid('email') }).unknown(), {
  then: Joi.object({
    identifier: Joi.string().email().required(),
  }),
});
