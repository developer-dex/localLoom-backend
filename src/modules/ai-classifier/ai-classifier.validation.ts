import Joi from 'joi';

export const classifyServiceSchema = Joi.object({
  prompt: Joi.string().trim().min(1).max(2000).required().messages({
    'string.base': 'prompt must be a string',
    'string.empty': 'prompt is required',
    'string.min': 'prompt must not be empty',
    'string.max': 'prompt must not exceed 2000 characters',
    'any.required': 'prompt is required',
  }),
}).options({ stripUnknown: true });
