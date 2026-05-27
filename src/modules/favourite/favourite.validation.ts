import Joi from 'joi';

export const tradieIdParamSchema = Joi.object({
  tradieProfileId: Joi.string().uuid().required(),
});

export const addFavouriteSchema = Joi.object({
  tradieProfileId: Joi.string().uuid().required(),
});

export const favouritesListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});
