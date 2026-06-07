import Joi from 'joi';

export const userIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const userListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended', 'deleted').optional(),
  role: Joi.string().valid('customer', 'tradie').optional(),
  search: Joi.string().trim().max(200).optional().allow(''),
});
