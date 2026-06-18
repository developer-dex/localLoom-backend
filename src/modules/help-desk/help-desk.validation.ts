import Joi from 'joi';

export const createHelpDeskRequestSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).required(),
  email: Joi.string().email().required(),
  message: Joi.string().trim().min(10).max(5000).required(),
});
