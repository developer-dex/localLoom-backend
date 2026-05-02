import { Router } from 'express';
import { RegionController } from './region.controller';
import { validate } from '../../middleware';
import { regionIdParamSchema } from './region.validation';

const router = Router();
const controller = new RegionController();

router.get('/', controller.getAll);
router.get('/:id', validate(regionIdParamSchema, 'params'), controller.getById);

export default router;
