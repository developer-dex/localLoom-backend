import { Router } from 'express';
import { CategoryController } from './category.controller';
import { validate } from '../../middleware';
import { categoryIdParamSchema } from './category.validation';

const router = Router();
const controller = new CategoryController();

// All public — no auth required
router.get('/', controller.getAll);
router.get('/:id', validate(categoryIdParamSchema, 'params'), controller.getById);

export default router;
