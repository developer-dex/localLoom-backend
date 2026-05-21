import { Router, type RequestHandler } from 'express';
import express from 'express';
import { ChatController } from './chat.controller';
import { authenticateUser, validate } from '../../middleware';
import { createChatAttachmentUpload } from '../../services/file-upload.service';
import { chatSendRateLimiter, chatUploadRateLimiter } from './chat.rate-limit';
import {
  conversationIdParamSchema,
  listConversationsQuerySchema,
  createConversationSchema,
  messagesListQuerySchema,
  sendMessageSchema,
  markReadSchema,
} from './chat.validation';

const router = Router();
const controller = new ChatController();

// All chat routes require authentication
router.use(authenticateUser as unknown as RequestHandler);

// 1. GET /conversations — list conversations
router.get(
  '/conversations',
  validate(listConversationsQuerySchema, 'query'),
  controller.listConversations,
);

// 2. GET /conversations/:conversationId — get single conversation
router.get(
  '/conversations/:conversationId',
  validate(conversationIdParamSchema, 'params'),
  controller.getConversation,
);

// 3. POST /conversations — create or get conversation
router.post(
  '/conversations',
  express.json({ limit: '1mb' }) as unknown as RequestHandler,
  validate(createConversationSchema),
  controller.createOrGetConversation,
);

// 4. GET /conversations/:conversationId/messages — list messages
router.get(
  '/conversations/:conversationId/messages',
  validate(conversationIdParamSchema, 'params'),
  validate(messagesListQuerySchema, 'query'),
  controller.listMessages,
);

// 5. POST /messages — send message
router.post(
  '/messages',
  express.json({ limit: '1mb' }) as unknown as RequestHandler,
  chatSendRateLimiter as unknown as RequestHandler,
  validate(sendMessageSchema),
  controller.sendMessage,
);

// 6. POST /messages/upload — upload attachments
router.post(
  '/messages/upload',
  chatUploadRateLimiter as unknown as RequestHandler,
  createChatAttachmentUpload('files') as unknown as RequestHandler,
  controller.uploadAttachments,
);

// 7. POST /conversations/:conversationId/read — mark read
router.post(
  '/conversations/:conversationId/read',
  express.json({ limit: '1mb' }) as unknown as RequestHandler,
  validate(conversationIdParamSchema, 'params'),
  validate(markReadSchema),
  controller.markRead,
);

export default router;
