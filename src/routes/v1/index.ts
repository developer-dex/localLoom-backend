import { Router } from 'express';
import { authRoutes } from '../../modules/auth';
import { userRoutes } from '../../modules/user';
import { categoryRoutes } from '../../modules/category';
import { regionRoutes } from '../../modules/region';
import { tradieRoutes } from '../../modules/tradie';
import { chatRoutes } from '../../modules/chat';
import { reviewRoutes } from '../../modules/review';
import { favouriteRoutes } from '../../modules/favourite';
import { aiClassifierRoutes } from '../../modules/ai-classifier';
import { helpDeskRoutes } from '../../modules/help-desk';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/regions', regionRoutes);
router.use('/tradies', tradieRoutes);
router.use('/chat', chatRoutes);
router.use('/reviews', reviewRoutes);
router.use('/favourites', favouriteRoutes);
router.use('/ai', aiClassifierRoutes);
router.use('/help-desk', helpDeskRoutes);

export default router;
