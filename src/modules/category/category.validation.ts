import Joi from 'joi';

export const categoryIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
