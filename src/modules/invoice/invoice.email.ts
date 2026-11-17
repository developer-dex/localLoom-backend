import { Invoice, TradieProfile } from '../../models';
import { clientDisplayName } from './invoice.serializer';
import { formatInvoiceNumber } from './invoice.totals';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const nl2br = (value: string): string => escapeHtml(value).replace(/\n/g, '<br>');

const formatMoney = (value: string | number, currency: string): string =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(Number(value));

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)));
};

/** Builds the invoice email. Every user-entered value is HTML-escaped. */
export function buildInvoiceEmail(invoice: Invoice, profile: TradieProfile) {
  const number = formatInvoiceNumber(invoice.sequenceNumber);
  const business = profile.businessName ?? profile.user?.name ?? 'Your tradie';
  const clientName = clientDisplayName(invoice) || 'there';
  const total = formatMoney(invoice.total, invoice.currency);
  const lineItems = [...(invoice.lineItems ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const rows = lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #EEEEEE">
            <strong>${escapeHtml(item.name)}</strong>
            ${item.description ? `<div style="color:#717171;font-size:13px">${nl2br(item.description)}</div>` : ''}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #EEEEEE;text-align:right;white-space:nowrap">
            ${Number(item.quantity)} × ${formatMoney(item.unitPrice, invoice.currency)}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #EEEEEE;text-align:right;white-space:nowrap">
            ${formatMoney(item.total, invoice.currency)}
          </td>
        </tr>`,
    )
    .join('');

  const summaryRow = (label: string, value: string, bold = false) => `
    <tr>
      <td colspan="2" style="padding:6px 0;text-align:right;${bold ? 'font-weight:700' : 'color:#4E5059'}">${label}</td>
      <td style="padding:6px 0;text-align:right;${bold ? 'font-weight:700' : ''}">${value}</td>
    </tr>`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;color:#1A1A1A;max-width:600px;margin:0 auto">
    <h2 style="margin:0 0 4px">${escapeHtml(business)}</h2>
    <p style="margin:0 0 24px;color:#717171">${number} · ${escapeHtml(invoice.title)}</p>
    <p>Hi ${escapeHtml(clientName)},</p>
    ${invoice.clientMessage ? `<p>${nl2br(invoice.clientMessage)}</p>` : `<p>Please find your invoice below.</p>`}
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="color:#717171">Issued</td><td style="text-align:right">${formatDate(invoice.issuedDate)}</td></tr>
      <tr><td style="color:#717171">Due</td><td style="text-align:right">${formatDate(invoice.dueDate)}</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse">
      ${rows}
      ${summaryRow('Subtotal', formatMoney(invoice.subtotal, invoice.currency))}
      ${Number(invoice.discountAmount) > 0 ? summaryRow('Discount', `−${formatMoney(invoice.discountAmount, invoice.currency)}`) : ''}
      ${Number(invoice.taxAmount) > 0 ? summaryRow(`GST/Tax (${Number(invoice.taxRate)}%)`, formatMoney(invoice.taxAmount, invoice.currency)) : ''}
      ${summaryRow('Total', total, true)}
    </table>
    ${invoice.disclaimer ? `<p style="margin-top:24px;color:#717171;font-size:13px">${nl2br(invoice.disclaimer)}</p>` : ''}
    <p style="margin-top:24px;color:#9A9A9A;font-size:12px">Sent with LocalLoom — find local, hire verified.</p>
  </div>`;

  const text = [
    `${business} — ${number}`,
    `Hi ${clientName},`,
    invoice.clientMessage ?? 'Please find your invoice below.',
    '',
    ...lineItems.map(
      (item) => `${item.name}: ${Number(item.quantity)} × ${formatMoney(item.unitPrice, invoice.currency)} = ${formatMoney(item.total, invoice.currency)}`,
    ),
    '',
    `Total: ${total}`,
    `Due: ${formatDate(invoice.dueDate)}`,
    invoice.disclaimer ?? '',
  ].join('\n');

  return {
    subject: `Invoice ${number} from ${business} — ${total}`,
    text,
    html,
  };
}
