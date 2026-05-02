import Joi from 'joi';

export const createRegionSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
});

export const updateRegionSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  isActive: Joi.boolean().optional(),
});

export const regionIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
