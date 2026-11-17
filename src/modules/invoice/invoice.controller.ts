import { Request, Response } from 'express';
import { InvoiceService } from './invoice.service';
import { ApiResponse, asyncHandler, parsePaginationQuery } from '../../common/utils';
import { AuthenticatedRequest } from '../../common/interfaces';
import { INVOICE_MESSAGES } from '../../common/constants';
import { InvoiceInputDto } from './invoice.interface';
import { InvoiceStatus } from '../../models';

export class InvoiceController {
  private service: InvoiceService;

  constructor() {
    this.service = new InvoiceService();
  }

  list = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { page, limit } = parsePaginationQuery(req.query);
    const result = await this.service.list(userId, {
      page,
      limit,
      status: req.query.status as InvoiceStatus | undefined,
      search: req.query.search as string | undefined,
    });
    ApiResponse.paginated(res, result.data, result.meta, INVOICE_MESSAGES.LIST_FETCHED);
  });

  clients = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const clients = await this.service.listClients(userId, req.query.search as string | undefined);
    ApiResponse.success(res, clients, INVOICE_MESSAGES.CLIENTS_FETCHED);
  });

  aiDraft = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const draft = await this.service.aiDraft(userId, req.body.prompt);
    ApiResponse.success(res, draft, INVOICE_MESSAGES.DRAFT_GENERATED);
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const invoice = await this.service.get(userId, req.params.id);
    ApiResponse.success(res, invoice, INVOICE_MESSAGES.FETCHED);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const invoice = await this.service.create(userId, req.body as InvoiceInputDto);
    ApiResponse.created(res, invoice, INVOICE_MESSAGES.CREATED);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const invoice = await this.service.update(userId, req.params.id, req.body as InvoiceInputDto);
    ApiResponse.success(res, invoice, INVOICE_MESSAGES.UPDATED);
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    await this.service.remove(userId, req.params.id);
    ApiResponse.success(res, null, INVOICE_MESSAGES.DELETED);
  });

  send = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const result = await this.service.send(userId, req.params.id);
    const message = result.delivery.method === 'email' ? INVOICE_MESSAGES.SENT : INVOICE_MESSAGES.MARKED_SENT;
    ApiResponse.success(res, result, message);
  });

  markPaid = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const invoice = await this.service.markPaid(userId, req.params.id);
    ApiResponse.success(res, invoice, INVOICE_MESSAGES.MARKED_PAID);
  });
}
