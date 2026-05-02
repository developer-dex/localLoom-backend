import { Router } from 'express';
import { AdminRegionsController } from './admin-regions.controller';
import { validate } from '../../middleware';
import { createRegionSchema, updateRegionSchema, regionIdParamSchema } from './admin-regions.validation';

const router = Router();
const controller = new AdminRegionsController();

router.get('/', controller.getAll);
router.post('/', validate(createRegionSchema), controller.create);
router.patch('/:id', validate(regionIdParamSchema, 'params'), validate(updateRegionSchema), controller.update);
router.delete('/:id', validate(regionIdParamSchema, 'params'), controller.softDelete);

export default router;
