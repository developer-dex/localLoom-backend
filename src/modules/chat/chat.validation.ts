import Joi from 'joi';

const uuid = Joi.string().uuid({ version: 'uuidv4' });

export const conversationIdParamSchema = Joi.object({
  conversationId: uuid.required(),
});

export const listConversationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().max(100).optional().allow(''),
  sort: Joi.string().optional(),
  order: Joi.string().optional(),
});

export const createConversationSchema = Joi.object({
  otherUserId: uuid.required(),
});

export const messagesListQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(100),
  before: uuid.optional(),
});

export const attachmentDescriptorSchema = Joi.object({
  url: Joi.string().pattern(/^\/public\/chat-attachments\//).required(),
  type: Joi.string().valid('image', 'video').required(),
  mime: Joi.string().min(1).required(),
  size: Joi.number().integer().min(0).required(),
  thumbnailUrl: Joi.string().optional(),
  width: Joi.number().integer().min(1).optional(),
  height: Joi.number().integer().min(1).optional(),
  durationMs: Joi.number().integer().min(0).optional(),
});

export const sendMessageSchema = Joi.object({
  conversationId: uuid.optional(),
  recipientId: uuid.optional(),
  content: Joi.string().trim().max(5000).optional().allow(''),
  type: Joi.string().valid('text', 'image', 'video', 'mixed').optional(),
  attachments: Joi.array().items(attachmentDescriptorSchema).max(5).optional(),
  clientMessageId: Joi.string().max(64).optional(),
})
  .or('conversationId', 'recipientId')
  .custom((value, helpers) => {
    const trimmed = (value.content ?? '').trim();
    const hasAttachments = Array.isArray(value.attachments) && value.attachments.length > 0;
    if (!trimmed && !hasAttachments) {
      return helpers.error('any.invalid', { message: 'content or attachments required' });
    }
    if (
      (value.type === 'image' || value.type === 'video' || value.type === 'mixed') &&
      !hasAttachments
    ) {
      return helpers.error('any.invalid', { message: 'attachments required for media messages' });
    }
    return value;
  });

export const messageUploadFieldsSchema = Joi.object({}).unknown(true);

export const markReadSchema = Joi.object({
  lastReadMessageId: uuid.optional(),
});
