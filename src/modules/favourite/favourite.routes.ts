import { Router, type RequestHandler } from 'express';
import { FavouriteController } from './favourite.controller';
import { validate, authenticateUser } from '../../middleware';
import {
  addFavouriteSchema,
  favouritesListQuerySchema,
  tradieIdParamSchema,
} from './favourite.validation';

const router = Router();
const controller = new FavouriteController();

// All favourite routes require authentication
router.use(authenticateUser as unknown as RequestHandler);

router.get('/', validate(favouritesListQuerySchema, 'query'), controller.list);
router.post('/', validate(addFavouriteSchema), controller.add);
router.delete('/:tradieProfileId', validate(tradieIdParamSchema, 'params'), controller.remove);

export default router;
