import { Router, type RequestHandler } from 'express';
import { AdminAuthController } from './admin-auth.controller';
import { validate, authenticateAdmin } from '../../middleware';
import { authLimiter } from '../../middleware';
import {
  adminLoginSchema,
  adminChangePasswordSchema,
  adminRefreshTokenSchema,
} from './admin-auth.validation';

const router = Router();
const controller = new AdminAuthController();

// Public routes
router.post('/login', authLimiter, validate(adminLoginSchema), controller.login);
router.post('/refresh-token', validate(adminRefreshTokenSchema), controller.refreshToken);

// Protected routes (admin only)
router.use(authenticateAdmin as unknown as RequestHandler);
router.post('/logout', controller.logout);
router.get('/profile', controller.getProfile);
router.patch('/change-password', validate(adminChangePasswordSchema), controller.changePassword);

export default router;
