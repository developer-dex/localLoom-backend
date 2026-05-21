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

// ─── Chat attachment upload ──────────────────────────────────────────────────

export const ALLOWED_CHAT_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_CHAT_VIDEO_MIME = ['video/mp4', 'video/quicktime', 'video/webm'];
export const CHAT_IMAGE_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB
export const CHAT_VIDEO_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB
const MAX_CHAT_FILES_PER_REQUEST = 5;

/**
 * Creates a multer middleware for chat attachment uploads.
 * Accepts image and video MIME types, applies a 50MB ceiling at the multer layer
 * (per-MIME enforcement is done post-upload in the controller), stores files under
 * `public/chat-attachments/` with `{timestamp}-{random}{ext}` filenames.
 *
 * @param fieldName - repeating form field name (default: 'files')
 */
export const createChatAttachmentUpload = (fieldName = 'files') => {
  const uploadDir = path.join('public', 'chat-attachments');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });

  const chatFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    if (ALLOWED_CHAT_IMAGE_MIME.includes(file.mimetype)) return cb(null, true);
    if (ALLOWED_CHAT_VIDEO_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new BadRequestException(`Unsupported MIME type: ${file.mimetype}`));
  };

  return multer({
    storage,
    limits: { fileSize: CHAT_VIDEO_SIZE_LIMIT, files: MAX_CHAT_FILES_PER_REQUEST },
    fileFilter: chatFileFilter,
  }).array(fieldName, MAX_CHAT_FILES_PER_REQUEST);
};
