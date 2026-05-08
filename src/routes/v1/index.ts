import { Router } from 'express';
import { authRoutes } from '../../modules/auth';
import { userRoutes } from '../../modules/user';
import { categoryRoutes } from '../../modules/category';
import { regionRoutes } from '../../modules/region';
import { tradieRoutes } from '../../modules/tradie';
import { chatRoutes } from '../../modules/chat';
import { reviewRoutes } from '../../modules/review';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/regions', regionRoutes);
router.use('/tradies', tradieRoutes);
router.use('/chat', chatRoutes);
router.use('/reviews', reviewRoutes);

export default router;
