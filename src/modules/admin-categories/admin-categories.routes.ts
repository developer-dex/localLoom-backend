import { Router } from 'express';
import { AdminCategoriesController } from './admin-categories.controller';
import { validate } from '../../middleware';
import { createImageUpload } from '../../services/file-upload.service';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from './admin-categories.validation';

const router = Router();
const controller = new AdminCategoriesController();
const uploadCategoryIcon = createImageUpload('category', 'icon');

// All routes require admin auth (applied at parent router level)
router.get('/', controller.getAll);

// Icon is uploaded as multipart/form-data — multer runs before validation
router.post('/', uploadCategoryIcon, validate(createCategorySchema), controller.create);
router.patch('/:id', validate(categoryIdParamSchema, 'params'), uploadCategoryIcon, validate(updateCategorySchema), controller.update);
router.delete('/:id', validate(categoryIdParamSchema, 'params'), controller.softDelete);

export default router;
