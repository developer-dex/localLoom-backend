import { Router } from 'express';
import { AdminReviewsController } from './admin-reviews.controller';
import { validate } from '../../middleware';
import {
  reviewIdParamSchema,
  reviewListQuerySchema,
  rejectReviewSchema,
  bulkApproveReviewsSchema,
  bulkRejectReviewsSchema,
} from './admin-reviews.validation';

const router = Router();
const controller = new AdminReviewsController();

// All routes require admin auth (applied at parent router level)
router.get('/', validate(reviewListQuerySchema, 'query'), controller.getAll);
router.get('/:id', validate(reviewIdParamSchema, 'params'), controller.getById);
router.patch('/:id/approve', validate(reviewIdParamSchema, 'params'), controller.approve);
router.patch('/:id/reject', validate(reviewIdParamSchema, 'params'), validate(rejectReviewSchema), controller.reject);
router.post('/bulk-approve', validate(bulkApproveReviewsSchema), controller.bulkApprove);
router.post('/bulk-reject', validate(bulkRejectReviewsSchema), controller.bulkReject);

export default router;
