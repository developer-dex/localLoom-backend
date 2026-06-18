import { Router } from 'express';
import { AdminHelpDeskController } from './admin-help-desk.controller';

const router = Router();
const controller = new AdminHelpDeskController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.patch('/:id/resolve', controller.resolve);

export default router;
