import { Router, type RequestHandler } from 'express';
import { UserController } from './user.controller';
import { authenticateUser, validate } from '../../middleware';
import { uploadSingle } from '../../middleware';
import { updateUserSchema } from './user.validation';

const router = Router();
const controller = new UserController();

// All user routes require authentication
router.use(authenticateUser as unknown as RequestHandler);

router.get('/me', controller.getMe);
router.patch('/me', validate(updateUserSchema), controller.updateMe);
router.patch('/me/avatar', uploadSingle('avatar'), controller.updateAvatar);
router.delete('/me', controller.deleteMe);

export default router;
