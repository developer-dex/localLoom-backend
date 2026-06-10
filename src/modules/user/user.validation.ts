import Joi from 'joi';

export const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{6,14}$/)
    .optional()
    .messages({ 'string.pattern.base': 'Phone must be in E.164 format (e.g., +61412345678)' }),
});
