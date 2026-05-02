import { Router, type RequestHandler } from 'express';
import { adminAuthRoutes } from '../../modules/admin-auth';
import { adminCategoriesRoutes } from '../../modules/admin-categories';
import { adminRegionsRoutes } from '../../modules/admin-regions';
import { authenticateAdmin } from '../../middleware';

const router = Router();

router.use('/auth', adminAuthRoutes);

// All routes below require admin authentication
router.use(authenticateAdmin as unknown as RequestHandler);

router.use('/categories', adminCategoriesRoutes);
router.use('/regions', adminRegionsRoutes);

export default router;
