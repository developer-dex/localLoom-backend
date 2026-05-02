import { Router, type RequestHandler } from 'express';
import { TradieController } from './tradie.controller';
import { validate, authenticateUser, authorize, optionalAuthenticateUser } from '../../middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  setupTradieProfileSchema,
  tradieIdParamSchema,
  tradieDetailsQuerySchema,
  photoIdParamSchema,
  tradieListQuerySchema,
  abnLookupSchema,
} from './tradie.validation';

const router = Router();
const controller = new TradieController();

// Multer for profile setup — accepts businessImage and businessVideo
const uploadProfileSetup = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join('public', 'businessDetails');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for video
}).fields([
  { name: 'businessImage', maxCount: 1 },
  { name: 'businessVideo', maxCount: 1 },
]);

// Work photos multer
const uploadWorkPhotos = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join('public', 'workImage');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
}).array('images', 20);

// ── Public routes (no auth) ──
router.get('/', optionalAuthenticateUser as unknown as RequestHandler, validate(tradieListQuerySchema, 'query'), controller.list);
router.get('/:id', validate(tradieIdParamSchema, 'params'), controller.getPublic);
router.get('/:id/details', validate(tradieIdParamSchema, 'params'), validate(tradieDetailsQuerySchema, 'query'), controller.getDetails);
router.get('/:id/reviews', validate(tradieIdParamSchema, 'params'), controller.getReviews);
router.get('/:id/work-photos', validate(tradieIdParamSchema, 'params'), controller.getWorkPhotos);

// ── Authenticated routes ──
router.use(authenticateUser as unknown as RequestHandler);

// Customer: view contact details
router.get('/:id/contact', validate(tradieIdParamSchema, 'params'), controller.getContact);

// ABN lookup (any authenticated user)
router.post('/abn-lookup', validate(abnLookupSchema), controller.abnLookup);

// Tradie self-management (tradie role only)
router.get('/me/profile', authorize('tradie') as unknown as RequestHandler, controller.getMyProfile);

// Single profile setup endpoint (create or update)
router.post(
  '/business/setup',
  authorize('tradie') as unknown as RequestHandler,
  uploadProfileSetup,
  validate(setupTradieProfileSchema),
  controller.setupProfile,
);

// Work photos
router.post('/profile/work-photos', authorize('tradie') as unknown as RequestHandler, uploadWorkPhotos, controller.addWorkPhotos);
router.delete('/profile/work-photos/:photoId', authorize('tradie') as unknown as RequestHandler, validate(photoIdParamSchema, 'params'), controller.deleteWorkPhoto);

// Stats
router.get('/profile/stats', authorize('tradie') as unknown as RequestHandler, controller.getStats);

export default router;
