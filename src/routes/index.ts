import { Router } from 'express';
import v1Routes from './v1';
import adminRoutes from './admin';

const router = Router();

router.use('/v1', v1Routes);
router.use('/admin', adminRoutes);

export default router;
