import { Router } from 'express';
import { AdminUsersController } from './admin-users.controller';
import { validate } from '../../middleware';
import { userIdParamSchema, userListQuerySchema } from './admin-users.validation';

const router = Router();
const controller = new AdminUsersController();

// All routes require admin auth (applied at parent router level)
router.get('/', validate(userListQuerySchema, 'query'), controller.getAll);
router.get('/:id', validate(userIdParamSchema, 'params'), controller.getById);
router.delete('/:id', validate(userIdParamSchema, 'params'), controller.deleteUser);

export default router;
