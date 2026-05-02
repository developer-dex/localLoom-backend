export class HttpException extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, HttpException.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestException extends HttpException {
  constructor(message = 'Bad request') {
    super(400, message);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundException extends HttpException {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

export class ConflictException extends HttpException {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

export class TooManyRequestsException extends HttpException {
  constructor(message = 'Too many requests') {
    super(429, message);
  }
}

export class InternalServerException extends HttpException {
  constructor(message = 'Internal server error') {
    super(500, message, false);
  }
}
