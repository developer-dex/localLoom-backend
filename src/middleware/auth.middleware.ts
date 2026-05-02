import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedRequest, AuthPayload } from '../common/interfaces';
import { UnauthorizedException, ForbiddenException } from '../common/exceptions';

/**
 * Authenticate any valid JWT token (user or admin).
 * Sets req.user with { userId, role, userType }.
 */
export const authenticate = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Authentication token is required');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    throw new UnauthorizedException('Invalid or expired token');
  }
};

/**
 * Authenticate and ensure the token belongs to a regular user (customer/tradie).
 */
export const authenticateUser = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Authentication token is required');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret) as AuthPayload;
    if (decoded.userType !== 'user') {
      throw new ForbiddenException('This endpoint is for users only');
    }
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof ForbiddenException) throw error;
    throw new UnauthorizedException('Invalid or expired token');
  }
};

/**
 * Authenticate and ensure the token belongs to an admin.
 */
export const authenticateAdmin = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Authentication token is required');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret) as AuthPayload;
    if (decoded.userType !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof ForbiddenException) throw error;
    throw new UnauthorizedException('Invalid or expired token');
  }
};

/**
 * Optional authentication — sets req.user if a valid Bearer token is present,
 * but does NOT reject the request if no token is provided.
 * Use for public endpoints that show extra data to logged-in users.
 */
export const optionalAuthenticateUser = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.jwt.accessSecret) as AuthPayload;
      if (decoded.userType === 'user') {
        req.user = decoded;
      }
    } catch {
      // invalid token — just ignore, treat as unauthenticated
    }
  }
  next();
};

/**
 * Authorize by role strings. Works with both user and admin tokens.
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    next();
  };
};
