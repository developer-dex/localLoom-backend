import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { BadRequestException } from '../common/exceptions';

type ValidationTarget = 'body' | 'query' | 'params';

export const validate = (schema: Joi.ObjectSchema, target: ValidationTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(', ');
      throw new BadRequestException(message);
    }

    req[target] = value;
    next();
  };
};
