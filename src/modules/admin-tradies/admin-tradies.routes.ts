import { Router } from 'express';
import { AdminTradiesController } from './admin-tradies.controller';
import { validate } from '../../middleware';
import {
  tradieIdParamSchema,
  tradieListQuerySchema,
  rejectTradieSchema,
  bulkApproveSchema,
  bulkRejectSchema,
} from './admin-tradies.validation';

const router = Router();
const controller = new AdminTradiesController();

// All routes require admin auth (applied at parent router level)
router.get('/', validate(tradieListQuerySchema, 'query'), controller.getAll);
router.get('/:id', validate(tradieIdParamSchema, 'params'), controller.getById);
router.patch('/:id/approve', validate(tradieIdParamSchema, 'params'), controller.approve);
router.patch('/:id/reject', validate(tradieIdParamSchema, 'params'), validate(rejectTradieSchema), controller.reject);
router.post('/bulk-approve', validate(bulkApproveSchema), controller.bulkApprove);
router.post('/bulk-reject', validate(bulkRejectSchema), controller.bulkReject);

export default router;
