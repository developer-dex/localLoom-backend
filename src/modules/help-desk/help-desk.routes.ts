import { Router } from 'express';
import { HelpDeskController } from './help-desk.controller';
import { validate } from '../../middleware';
import { createHelpDeskRequestSchema } from './help-desk.validation';

const router = Router();
const controller = new HelpDeskController();

// Public route — no authentication required
router.post('/', validate(createHelpDeskRequestSchema), controller.create);

export default router;
