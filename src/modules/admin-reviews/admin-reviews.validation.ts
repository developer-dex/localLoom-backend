import Joi from 'joi';

export const reviewIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const reviewListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  search: Joi.string().trim().max(200).optional().allow(''),
});

export const rejectReviewSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(1).max(1000).required(),
});

export const bulkApproveReviewsSchema = Joi.object({
  ids: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
});

export const bulkRejectReviewsSchema = Joi.object({
  ids: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
  rejectionReason: Joi.string().trim().min(1).max(1000).required(),
});
