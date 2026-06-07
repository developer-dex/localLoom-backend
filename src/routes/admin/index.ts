import { Router, type RequestHandler } from 'express';
import { adminAuthRoutes } from '../../modules/admin-auth';
import { adminCategoriesRoutes } from '../../modules/admin-categories';
import { adminRegionsRoutes } from '../../modules/admin-regions';
import { adminTradiesRoutes } from '../../modules/admin-tradies';
import { adminReviewsRoutes } from '../../modules/admin-reviews';
import { adminUsersRoutes } from '../../modules/admin-users';
import { authenticateAdmin } from '../../middleware';

const router = Router();

// Mount auth routes at both /auth/* and directly at /* so that
// /api/admin/auth/login and /api/admin/login both work
router.use('/auth', adminAuthRoutes);
router.use('/', adminAuthRoutes);

// All routes below require admin authentication
router.use(authenticateAdmin as unknown as RequestHandler);

router.use('/categories', adminCategoriesRoutes);
router.use('/regions', adminRegionsRoutes);
router.use('/tradies', adminTradiesRoutes);
router.use('/reviews', adminReviewsRoutes);
router.use('/users', adminUsersRoutes);

export default router;
  