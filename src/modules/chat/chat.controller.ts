import fs from 'fs';
import { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { ApiResponse, asyncHandler, parsePaginationQuery, buildPaginationMeta } from '../../common/utils';
import { AuthenticatedRequest } from '../../common/interfaces';
import { CHAT_MESSAGES } from '../../common/constants';
import {
  CreateConversationDto,
  SendMessageDto,
  MarkReadDto,
} from './chat.interface';
import {
  ALLOWED_CHAT_IMAGE_MIME,
  ALLOWED_CHAT_VIDEO_MIME,
  CHAT_IMAGE_SIZE_LIMIT,
  CHAT_VIDEO_SIZE_LIMIT,
} from '../../services/file-upload.service';
import { ChatPayloadTooLargeException } from './chat.errors';

/**
 * Enforces per-MIME file size limits after multer has accepted the files.
 * Images are capped at 10 MB, videos at 50 MB.
 * If any file exceeds its limit, ALL uploaded files are deleted (best-effort)
 * and a ChatPayloadTooLargeException is thrown.
 */
export function enforcePerMimeSize(files: Express.Multer.File[]): void {
  const offenders = files.filter((f) =>
    ALLOWED_CHAT_IMAGE_MIME.includes(f.mimetype)
      ? f.size > CHAT_IMAGE_SIZE_LIMIT
      : ALLOWED_CHAT_VIDEO_MIME.includes(f.mimetype)
        ? f.size > CHAT_VIDEO_SIZE_LIMIT
        : true,
  );

  if (offenders.length > 0) {
    // Best-effort cleanup of all uploaded files
    for (const f of files) {
      try {
        fs.unlinkSync(f.path);
      } catch {
        /* best-effort */
      }
    }
    throw new ChatPayloadTooLargeException(
      `File ${offenders[0].originalname} exceeds the size limit for its type`,
    );
  }
}

export class ChatController {
  private service: ChatService;

  constructor(service?: ChatService) {
    this.service = service ?? new ChatService();
  }

  listConversations = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { page, limit } = parsePaginationQuery(req.query);
    const search = (req.query.search as string | undefined)?.trim() || undefined;
    const result = await this.service.listConversations(userId, { page, limit, search });
    const meta = buildPaginationMeta(result.total, result.page, result.limit);
    ApiResponse.paginated(res, result.items, meta, CHAT_MESSAGES.LIST_FETCHED);
  });

  getConversation = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const item = await this.service.getConversation(userId, req.params.conversationId);
    ApiResponse.success(res, item, CHAT_MESSAGES.FETCHED);
  });

  createOrGetConversation = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const dto = req.body as CreateConversationDto;
    const { conversation, created } = await this.service.getOrCreateConversation(userId, dto.otherUserId);
    if (created) {
      ApiResponse.created(res, conversation, CHAT_MESSAGES.CREATED);
    } else {
      ApiResponse.success(res, conversation, CHAT_MESSAGES.FETCHED);
    }
  });

  listMessages = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const limit = Number(req.query.limit) || 100;
    const before = req.query.before as string | undefined;
    const { items, meta } = await this.service.listMessages(userId, req.params.conversationId, { limit, before });
    ApiResponse.success(res, { items, meta }, CHAT_MESSAGES.MESSAGES_FETCHED);
  });

  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const dto = req.body as SendMessageDto;
    const result = await this.service.sendMessage(userId, dto);
    ApiResponse.created(res, result, CHAT_MESSAGES.MESSAGE_SENT);
  });

  uploadAttachments = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    if (files.length === 0) {
      throw new ChatPayloadTooLargeException('At least one file is required');
    }

    // Enforce per-MIME size limits
    enforcePerMimeSize(files);

    const descriptors = this.service.buildAttachmentDescriptors(userId, files, req.body);
    ApiResponse.created(res, descriptors, CHAT_MESSAGES.UPLOADED);
  });

  markRead = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const dto = req.body as MarkReadDto;
    const result = await this.service.markRead(userId, req.params.conversationId, dto.lastReadMessageId);
    ApiResponse.success(res, result, CHAT_MESSAGES.MESSAGES_READ);
  });
}
