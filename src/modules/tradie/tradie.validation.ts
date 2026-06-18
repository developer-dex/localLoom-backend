import Joi from 'joi';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Multipart/form-data sends arrays as comma-separated strings or repeated fields.
// This custom handler normalises both into a proper array.
const csvOrArray = (itemSchema: Joi.Schema) =>
  Joi.alternatives().try(
    Joi.array().items(itemSchema),
    Joi.string().custom((value) => {
      return value.split(',').map((s: string) => s.trim()).filter(Boolean);
    }),
  );

export const setupTradieProfileSchema = Joi.object({
  businessName: Joi.string().trim().max(200).required(),
  businessNumber: Joi.string().trim().max(50).optional().allow(''),
  categoryIds: csvOrArray(Joi.string().uuid()).required(),
  regionIds: csvOrArray(Joi.string().uuid()).required(),
  serviceDescription: Joi.string().trim().max(2000).optional().allow(''),
  website: Joi.string().trim().max(500).optional().allow(''),
  timeFrom: Joi.string().pattern(TIME_PATTERN).optional().allow('').messages({
    'string.pattern.base': 'timeFrom must be in HH:MM format (e.g. 09:00)',
  }),
  timeTo: Joi.string().pattern(TIME_PATTERN).optional().allow('').messages({
    'string.pattern.base': 'timeTo must be in HH:MM format (e.g. 17:00)',
  }),
  openDays: Joi.alternatives().try(
    Joi.array().items(Joi.string().valid(...DAYS)),
    Joi.string().custom((value) => {
      return value.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    }),
  ).optional(),
  isEmergencyAvailable: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
  abn: Joi.string().trim().min(9).max(20).required(),
  abnData: Joi.alternatives().try(
    Joi.object({
      businessName: Joi.string().optional().allow(''),
      status: Joi.string().optional().allow(''),
      entityType: Joi.string().optional().allow(''),
    }),
    Joi.string(),
  ).optional(),
  licenseNumber: Joi.string().trim().max(50).optional().allow(''),
  licenseExpiryDate: Joi.string().isoDate().optional().allow('').messages({
    'string.isoDate': 'licenseExpiryDate must be a valid date (YYYY-MM-DD)',
  }),
});

export const tradieIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const tradieDetailsQuerySchema = Joi.object({
  type: Joi.string().valid('about', 'work', 'reviews').required(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
});

export const photoIdParamSchema = Joi.object({
  photoId: Joi.string().uuid().required(),
});

export const tradieListQuerySchema = Joi.object({
  categoryId: Joi.string().uuid().optional(),
  regionId: Joi.string().uuid().optional(),
  rating: Joi.number().min(1).max(5).optional(),
  availability: Joi.string().valid('true', 'false').optional(),
  emergency: Joi.string().valid('true', 'false').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
});

export const abnLookupSchema = Joi.object({
  abn: Joi.string().trim().min(9).max(20).required(),
});

export const setServicesSchema = Joi.object({
  categoryIds: Joi.array().items(Joi.string().uuid()).min(1).max(6).required(),
});

export const setRegionsSchema = Joi.object({
  regionIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
});
