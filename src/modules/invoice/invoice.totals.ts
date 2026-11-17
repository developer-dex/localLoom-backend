import { InvoiceDiscountType, InvoicePaymentTerms } from '../../models';

/**
 * Pure money/date helpers for invoices. All arithmetic is done in integer
 * cents so totals never drift from float rounding; the web app mirrors this
 * logic in `src/utils/invoiceTotals.ts` for its live preview, but the values
 * stored and sent are always the ones computed here.
 */

export const INVOICE_TIMEZONE = 'Australia/Melbourne';

export interface LineItemAmountsInput {
  quantity: number;
  unitPrice: number;
}

export interface InvoiceTotalsInput {
  lineItems: LineItemAmountsInput[];
  discountType: InvoiceDiscountType;
  discountValue: number;
  taxRate: number;
}

export interface InvoiceTotals {
  lineTotals: number[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

const toCents = (value: number): number => Math.round(value * 100);
const fromCents = (cents: number): number => cents / 100;

export function computeLineTotal(quantity: number, unitPrice: number): number {
  return fromCents(Math.round(quantity * toCents(unitPrice)));
}

export function computeInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const lineCents = input.lineItems.map((item) => Math.round(item.quantity * toCents(item.unitPrice)));
  const subtotalCents = lineCents.reduce((sum, cents) => sum + cents, 0);

  const rawDiscountCents =
    input.discountType === 'percent'
      ? Math.round((subtotalCents * input.discountValue) / 100)
      : toCents(input.discountValue);
  const discountCents = Math.min(Math.max(rawDiscountCents, 0), subtotalCents);

  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round((taxableCents * input.taxRate) / 100);

  return {
    lineTotals: lineCents.map(fromCents),
    subtotal: fromCents(subtotalCents),
    discountAmount: fromCents(discountCents),
    taxAmount: fromCents(taxCents),
    total: fromCents(taxableCents + taxCents),
  };
}

/** Today's calendar date in Melbourne as YYYY-MM-DD. */
export function todayInInvoiceTimezone(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: INVOICE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Derives the due date (YYYY-MM-DD) from the issue date and payment terms. */
export function computeDueDate(issuedDate: string, terms: InvoicePaymentTerms): string {
  const issued = parseDateOnly(issuedDate);
  const year = issued.getUTCFullYear();
  const month = issued.getUTCMonth();

  switch (terms) {
    case 'due_on_receipt':
      return issuedDate;
    case 'end_of_month':
      // Day 0 of the next month is the last day of this one.
      return formatDateOnly(new Date(Date.UTC(year, month + 1, 0)));
    case 'end_of_next_month':
      return formatDateOnly(new Date(Date.UTC(year, month + 2, 0)));
    default: {
      const days = Number(terms.replace('net_', ''));
      const due = new Date(issued);
      due.setUTCDate(due.getUTCDate() + days);
      return formatDateOnly(due);
    }
  }
}

export function formatInvoiceNumber(sequenceNumber: number): string {
  return `INV-${String(sequenceNumber).padStart(4, '0')}`;
}
