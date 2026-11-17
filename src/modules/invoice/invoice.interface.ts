import {
  InvoiceDiscountType,
  InvoiceIssueDateMode,
  InvoicePaymentTerms,
  InvoiceStatus,
} from '../../models';

export const PAYMENT_TERMS: InvoicePaymentTerms[] = [
  'due_on_receipt',
  'net_7',
  'net_15',
  'net_30',
  'net_45',
  'net_60',
  'end_of_month',
  'end_of_next_month',
];

export const DEFAULT_INVOICE_TITLE = 'For Services Rendered';
export const DEFAULT_DISCLAIMER =
  'Thank you for your business. Please contact us with any questions regarding this invoice.';

export interface LineItemDto {
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
}

/** Body for POST /invoices and PATCH /invoices/:id (every field optional on PATCH). */
export interface InvoiceInputDto {
  clientUserId?: string | null;
  clientFirstName?: string | null;
  clientLastName?: string | null;
  clientAddress?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  title?: string;
  issueDateMode?: InvoiceIssueDateMode;
  issuedDate?: string | null;
  paymentTerms?: InvoicePaymentTerms;
  discountType?: InvoiceDiscountType;
  discountValue?: number;
  taxRate?: number;
  clientMessage?: string | null;
  disclaimer?: string | null;
  /** When present, replaces the whole list. */
  lineItems?: LineItemDto[];
}

export interface InvoiceListQuery {
  status?: InvoiceStatus;
  search?: string;
  page: number;
  limit: number;
}

export interface InvoiceClientOption {
  /** Stable key for the picker: the user id, or a hash of the typed details. */
  key: string;
  clientUserId: string | null;
  firstName: string;
  lastName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  /**
   * True when the client is a LocalLoom user with an email on their account.
   * The address itself is never exposed to the tradie; sending uses it server-side.
   */
  hasAccountEmail: boolean;
  source: 'chat' | 'invoice';
}

export interface InvoiceAiDraft {
  title: string;
  clientFirstName: string;
  clientLastName: string;
  clientAddress: string;
  lineItems: LineItemDto[];
}

export interface InvoiceDelivery {
  method: 'email' | 'manual';
  /** Display form of the recipient; masked when it is the client's account email. */
  to: string | null;
}
