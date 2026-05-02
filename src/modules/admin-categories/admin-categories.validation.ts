import Joi from 'joi';

export const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  icon: Joi.string().trim().max(500).optional(),
  description: Joi.string().trim().max(1000).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  icon: Joi.string().trim().max(500).optional().allow(null, ''),
  description: Joi.string().trim().max(1000).optional().allow(null, ''),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
});

export const categoryIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
