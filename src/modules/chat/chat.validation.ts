import Joi from 'joi';

export const createConversationSchema = Joi.object({
  tradieId: Joi.string().uuid().required(),
});

export const sendMessageSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
  content: Joi.string().trim().min(1).max(5000).required(),
  type: Joi.string().valid('text', 'image', 'file', 'system').optional(),
  attachments: Joi.array().items(Joi.string()).optional(),
});

export const conversationIdParamSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
});

export const messageListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});
