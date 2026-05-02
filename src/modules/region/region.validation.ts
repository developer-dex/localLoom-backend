import Joi from 'joi';

export const regionIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
