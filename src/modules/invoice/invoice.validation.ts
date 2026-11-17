import Joi from 'joi';
import { PAYMENT_TERMS } from './invoice.interface';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^[+0-9()\-\s]{6,20}$/;

const optionalText = (max: number) => Joi.string().trim().max(max).allow('', null);

const lineItemSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  description: optionalText(1000),
  quantity: Joi.number().greater(0).max(100000).precision(2).required(),
  unitPrice: Joi.number().min(0).max(100000000).precision(2).required(),
});

const invoiceFields = {
  clientUserId: Joi.string().uuid().allow(null),
  clientFirstName: optionalText(100),
  clientLastName: optionalText(100),
  clientAddress: optionalText(500),
  clientPhone: Joi.string().trim().pattern(PHONE).allow('', null).messages({
    'string.pattern.base': 'Enter a valid phone number',
  }),
  clientEmail: Joi.string().trim().lowercase().email().max(255).allow('', null),
  title: Joi.string().trim().min(1).max(200),
  issueDateMode: Joi.string().valid('date_sent', 'custom'),
  issuedDate: Joi.string().pattern(DATE_ONLY).allow(null).messages({
    'string.pattern.base': 'issuedDate must be in YYYY-MM-DD format',
  }),
  paymentTerms: Joi.string().valid(...PAYMENT_TERMS),
  discountType: Joi.string().valid('amount', 'percent'),
  discountValue: Joi.number().min(0).max(100000000).precision(2)
    .when('discountType', { is: 'percent', then: Joi.number().max(100) }),
  taxRate: Joi.number().min(0).max(100).precision(2),
  clientMessage: optionalText(2000),
  disclaimer: optionalText(2000),
  lineItems: Joi.array().items(lineItemSchema).max(100),
};

export const createInvoiceSchema = Joi.object(invoiceFields);

export const updateInvoiceSchema = Joi.object(invoiceFields).min(1);

export const invoiceIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const invoiceListQuerySchema = Joi.object({
  status: Joi.string().valid('draft', 'sent', 'paid', 'void'),
  search: Joi.string().trim().max(100).allow(''),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

export const invoiceClientsQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow(''),
});

export const invoiceAiDraftSchema = Joi.object({
  prompt: Joi.string().trim().min(3).max(2000).required().messages({
    'string.empty': 'Describe the job to draft an invoice',
    'string.min': 'Describe the job in a few more words',
  }),
});
