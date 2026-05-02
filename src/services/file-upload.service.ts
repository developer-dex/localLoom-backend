import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { BadRequestException } from '../common/exceptions';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
};

/**
 * Creates a multer upload middleware for a specific subfolder inside `public/`.
 *
 * @param subfolder - folder name inside `public/` (e.g., 'category', 'avatar', 'work-photos')
 * @param fieldName - form field name (default: 'file')
 * @param maxFileSize - max file size in bytes (default: 5MB)
 */
export const createImageUpload = (subfolder: string, fieldName = 'file', maxFileSize = 5 * 1024 * 1024) => {
  const uploadDir = path.join('public', subfolder);

  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxFileSize },
    fileFilter: imageFilter,
  }).single(fieldName);
};

/**
 * Returns the public URL path for an uploaded file.
 * e.g., `/public/category/1713200000-123456789.png`
 */
export const getFileUrl = (subfolder: string, filename: string): string => {
  return `/public/${subfolder}/${filename}`;
};

/**
 * Deletes a file from the public directory.
 * @param filePath - relative path like `/public/category/filename.png`
 */
export const deleteFile = (filePath: string): void => {
  // Strip leading slash
  const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  if (fs.existsSync(relativePath)) {
    fs.unlinkSync(relativePath);
  }
};
