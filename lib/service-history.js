/**
 * Service history for a vehicle.
 *
 * Keyed on the registration, not on a customer account, for the same
 * reason the warranty register is: somebody walks in a year later with a
 * car and a question, and they may never have had an account with us.
 */

import { BUSINESS, formatLKR } from '@/lib/business';

/**
 * Matches the plate_key generated column in the database — letters and
 * digits, uppercased. Kept in step with normalise_plate() in 005; if one
 * changes the other has to.
 */
export function normalisePlate(raw) {
  return String(raw ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

export function formatPlate(raw) {
  return String(raw ?? '').trim().toUpperCase();
}

/**
 * Every bill and every warranty ever recorded against a plate.
 *
 * Returns bills newest first, which is the order a mechanic asks about
 * them in — "what did we do last time?" long before "what did we do in
 * 2021?".
 */
export async function fetchServiceHistory(supabase, registration) {
  const key = normalisePlate(registration);
  if (!key) return { key: '', invoices: [], warranties: [] };

  const [{ data: invoices }, { data: warranties }] = await Promise.all([
    supabase
      .from('invoices')
      .select(`
        id, number, registration, vehicle_note, customer_name, notes,
        subtotal_cents, discount_cents, total_cents, paid_cents, created_at,
        invoice_items(id, description, kind, quantity, unit_price_cents,
                      warranty_months, sort_order),
        mechanic:profiles!performed_by(full_name)
      `)
      .eq('plate_key', key)
      .order('created_at', { ascending: false }),
    supabase
      .from('warranties')
      .select(
        'id, number, description, months, starts_on, expires_on, is_void, ' +
          'void_reason, fitted_by_name, claimed_at, invoice_id'
      )
      .eq('plate_key', key)
      .order('expires_on', { ascending: false }),
  ]);

  return {
    key,
    invoices: (invoices ?? []).map((invoice) => ({
      ...invoice,
      invoice_items: [...(invoice.invoice_items ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    })),
    warranties: warranties ?? [],
  };
}

/** True while the cover is still worth something to the customer. */
export function isWarrantyLive(warranty, on = new Date()) {
  if (!warranty || warranty.is_void) return false;
  return new Date(`${warranty.expires_on}T23:59:59`) >= on;
}

// ---------------------------------------------------------------------
// The emailed version.
//
// Email clients are a decade behind browsers, so this is tables and inline
// styles on purpose. It has to survive Gmail, Outlook and whatever the
// customer's phone uses, and still be readable printed on A4.
// ---------------------------------------------------------------------

const INK = '#1c1917';
const MUTED = '#6b6560';
const AMBER = '#b45309';
const LINE = '#e7e2dc';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dateLK(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-LK', { dateStyle: 'long' });
}

function warrantyRows(warranties) {
  if (warranties.length === 0) return '';

  const rows = warranties
    .map((w) => {
      const live = isWarrantyLive(w);
      const status = w.is_void
        ? `Void${w.void_reason ? ` — ${esc(w.void_reason)}` : ''}`
        : live
          ? `Covered until ${dateLK(w.expires_on)}`
          : `Expired ${dateLK(w.expires_on)}`;

      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${LINE};">
            <strong style="color:${INK};">${esc(w.description)}</strong><br>
            <span style="color:${MUTED};font-size:13px;">
              ${esc(w.number)} · fitted ${dateLK(w.starts_on)}${
                w.fitted_by_name ? ` by ${esc(w.fitted_by_name)}` : ''
              }
            </span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid ${LINE};text-align:right;
                     color:${live ? AMBER : MUTED};font-size:13px;white-space:nowrap;">
            ${status}
          </td>
        </tr>`;
    })
    .join('');

  return `
    <h2 style="font-size:16px;color:${INK};margin:32px 0 8px;">Warranties on this vehicle</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows}
    </table>`;
}

function invoiceBlock(invoice) {
  const lines = invoice.invoice_items
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 0;color:${INK};">
          ${esc(item.description)}${item.quantity > 1 ? ` × ${item.quantity}` : ''}
          ${
            item.warranty_months > 0
              ? `<span style="color:${AMBER};font-size:12px;"> · ${item.warranty_months}-month warranty</span>`
              : ''
          }
        </td>
        <td style="padding:6px 0;text-align:right;color:${MUTED};white-space:nowrap;">
          ${formatLKR(item.unit_price_cents * item.quantity)}
        </td>
      </tr>`
    )
    .join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border-collapse:collapse;margin:0 0 24px;padding:0 0 16px;
                  border-bottom:1px solid ${LINE};">
      <tr>
        <td style="padding:0 0 8px;">
          <strong style="color:${INK};">${dateLK(invoice.created_at)}</strong>
          <span style="color:${MUTED};font-size:13px;"> · ${esc(invoice.number)}${
            invoice.mechanic?.full_name ? ` · ${esc(invoice.mechanic.full_name)}` : ''
          }</span>
        </td>
        <td style="padding:0 0 8px;text-align:right;">
          <strong style="color:${INK};">${formatLKR(invoice.total_cents)}</strong>
        </td>
      </tr>
      ${lines}
      ${
        invoice.notes
          ? `<tr><td colspan="2" style="padding:8px 0 0;color:${MUTED};font-size:13px;font-style:italic;">${esc(
              invoice.notes
            )}</td></tr>`
          : ''
      }
    </table>`;
}

/**
 * The whole history as one email.
 *
 * Deliberately the same information as the printed copy — a customer who
 * asks for it by email and one who asks at the counter should not get
 * different answers.
 */
export function renderServiceHistoryEmail({ registration, history, customerName }) {
  const plate = formatPlate(registration);
  const live = history.warranties.filter((w) => isWarrantyLive(w));

  const body =
    history.invoices.length === 0
      ? `<p style="color:${MUTED};">We have no recorded work for ${esc(plate)} yet.</p>`
      : history.invoices.map(invoiceBlock).join('');

  const html = `
  <div style="margin:0;padding:24px;background:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid ${LINE};border-radius:12px;padding:32px;">

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td>
            <strong style="font-size:18px;color:${INK};">${esc(BUSINESS.name)}</strong><br>
            <span style="color:${MUTED};font-size:13px;">
              ${esc(BUSINESS.address.line1)}, ${esc(BUSINESS.address.city)} ${esc(BUSINESS.address.postcode)}
            </span>
          </td>
          <td style="text-align:right;">
            <span style="display:inline-block;padding:6px 12px;border:1px solid ${LINE};
                         border-radius:6px;font-family:monospace;font-size:15px;color:${INK};">
              ${esc(plate)}
            </span>
          </td>
        </tr>
      </table>

      <h1 style="font-size:20px;color:${INK};margin:0 0 4px;">Service history</h1>
      <p style="color:${MUTED};font-size:14px;margin:0 0 24px;">
        ${customerName ? `${esc(customerName)} — e` : 'E'}verything we have on record for this vehicle${
          live.length > 0
            ? `, including ${live.length} warrant${live.length === 1 ? 'y' : 'ies'} still in date`
            : ''
        }.
      </p>

      ${body}
      ${warrantyRows(history.warranties)}

      <p style="color:${MUTED};font-size:13px;margin:32px 0 0;padding-top:16px;border-top:1px solid ${LINE};">
        Parts carry a ${BUSINESS.partsWarrantyMonths}-month minimum warranty unless the
        line above says otherwise. Keep this email — quoting a warranty number is the
        quickest way for us to find the job.
      </p>
      <p style="color:${MUTED};font-size:13px;margin:8px 0 0;">
        Questions? Call us on ${esc(BUSINESS.contact.phone)}.
      </p>
    </div>
  </div>`;

  return {
    subject: `Service history for ${plate} — ${BUSINESS.name}`,
    html,
  };
}
