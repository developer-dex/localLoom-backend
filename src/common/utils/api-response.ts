import { Response } from 'express';
import { ApiResponseBody, PaginationMeta } from '../interfaces';

export class ApiResponse {
  static success<T>(res: Response, data: T, message = 'Success', statusCode = 200): Response {
    const body: ApiResponseBody<T> = {
      success: true,
      statusCode,
      message,
      data,
    };
    return res.status(statusCode).json(body);
  }

  static created<T>(res: Response, data: T, message = 'Created successfully'): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    meta: PaginationMeta,
    message = 'Fetched successfully',
  ): Response {
    const body: ApiResponseBody<T[]> = {
      success: true,
      statusCode: 200,
      message,
      data,
      meta,
    };
    return res.status(200).json(body);
  }

  static error(
    res: Response,
    message = 'Something went wrong',
    statusCode = 500,
    errors?: unknown,
  ): Response {
    const body: ApiResponseBody = {
      success: false,
      statusCode,
      message,
      ...(errors !== undefined && { errors }),
    };
    return res.status(statusCode).json(body);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
