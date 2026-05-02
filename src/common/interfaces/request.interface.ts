import { Request } from 'express';

export type UserType = 'user' | 'admin';

export interface AuthPayload {
  userId: string;
  role: string;
  userType: UserType;
}

export interface AuthenticatedRequest extends Request {
  user: AuthPayload;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

export interface FileRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}
