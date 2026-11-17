import { Router, type Request, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { InvoiceController } from './invoice.controller';
import { validate, authenticateUser } from '../../middleware';
import { AuthenticatedRequest } from '../../common/interfaces';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceIdParamSchema,
  invoiceListQuerySchema,
  invoiceClientsQuerySchema,
  invoiceAiDraftSchema,
} from './invoice.validation';

const router = Router();
const controller = new InvoiceController();

// Each AI draft is a paid model call, so cap it per signed-in user.
const aiDraftLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  keyGenerator: (req: Request) => (req as AuthenticatedRequest).user?.userId ?? req.ip ?? 'unknown',
  message: { success: false, statusCode: 429, message: 'Too many AI drafts, please wait a minute and try again' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All invoice routes require a signed-in user; the service checks for an approved tradie profile.
router.use(authenticateUser as unknown as RequestHandler);

router.get('/', validate(invoiceListQuerySchema, 'query'), controller.list);
router.get('/clients', validate(invoiceClientsQuerySchema, 'query'), controller.clients);
router.post('/ai-draft', aiDraftLimiter, validate(invoiceAiDraftSchema), controller.aiDraft);
router.post('/', validate(createInvoiceSchema), controller.create);
router.get('/:id', validate(invoiceIdParamSchema, 'params'), controller.get);
router.patch('/:id', validate(invoiceIdParamSchema, 'params'), validate(updateInvoiceSchema), controller.update);
router.delete('/:id', validate(invoiceIdParamSchema, 'params'), controller.remove);
router.post('/:id/send', validate(invoiceIdParamSchema, 'params'), controller.send);
router.post('/:id/mark-paid', validate(invoiceIdParamSchema, 'params'), controller.markPaid);

export default router;
