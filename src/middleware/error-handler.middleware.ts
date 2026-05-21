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
    const code = 'code' in err ? (err as HttpException & { code?: string }).code : undefined;
    ApiResponse.error(res, err.message, err.statusCode, code ? { code } : undefined);
    return;
  }

  logger.error('Unhandled error:', err);
  ApiResponse.error(res, 'Internal server error', 500);
};
