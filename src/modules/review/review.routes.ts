import { Router, type RequestHandler } from 'express';
import { ReviewController } from './review.controller';
import { validate, authenticateUser } from '../../middleware';
import { createReviewSchema, myReviewsQuerySchema } from './review.validation';

const router = Router();
const controller = new ReviewController();

// All review routes require authentication
router.use(authenticateUser as unknown as RequestHandler);

router.post('/', validate(createReviewSchema), controller.create);
router.get('/my-reviews', validate(myReviewsQuerySchema, 'query'), controller.getMyReviews);

export default router;
