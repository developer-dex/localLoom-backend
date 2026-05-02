import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import { env } from '../config/env';
import { BadRequestException } from '../common/exceptions';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.upload.dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
};

export const uploadSingle = (fieldName = 'file') =>
  multer({
    storage,
    limits: { fileSize: env.upload.maxFileSize },
    fileFilter: imageFilter,
  }).single(fieldName);

export const uploadMultiple = (fieldName = 'files', maxCount = 5) =>
  multer({
    storage,
    limits: { fileSize: env.upload.maxFileSize },
    fileFilter: imageFilter,
  }).array(fieldName, maxCount);
