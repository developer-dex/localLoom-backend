import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../common/exceptions';
import { ApiResponse } from '../common/utils';
import { logger } from '../common/utils/logger';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof HttpException) {
    ApiResponse.error(res, err.message, err.statusCode);
    return;
  }

  logger.error('Unhandled error:', err);
  ApiResponse.error(res, 'Internal server error', 500);
};
