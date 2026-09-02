'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { getTerminal } from '@/lib/payments/terminal';
import { discountFor } from '@/lib/promotions';

const TEAM = ['worker', 'admin'];

/** Reads the line items out of the form and totals them. */
function readItems(formData) {
  const descriptions = formData.getAll('item_description').map(String);
  const prices = formData.getAll('item_price').map(Number);
  const quantities = formData.getAll('item_quantity').map(Number);
  const kinds = formData.getAll('item_kind').map(String);

  return descriptions
    .map((description, i) => ({
      description: description.trim(),
      kind: kinds[i] ?? 'labour',
      quantity: Number.isFinite(quantities[i]) && quantities[i] > 0 ? quantities[i] : 1,
      unit_price_cents: Math.round((prices[i] || 0) * 100),
      // Parts carry the workshop's standing warranty; labour doesn't.
      warranty_months: (kinds[i] ?? 'labour') === 'part' ? 6 : 0,
      sort_order: i,
    }))
    .filter((item) => item.description && item.unit_price_cents > 0);
}

/** Creates a bill. Works for a booking or for a walk-in with no account. */
export async function createInvoice(_prevState, formData) {
  const { profile } = await requireRole(TEAM);
  const supabase = createClient();

  const items = readItems(formData);
  if (items.length === 0) {
    return { error: 'Add at least one line with a description and a price.' };
  }

  const bookingId = String(formData.get('booking_id') ?? '') || null;
  const code = String(formData.get('promo_code') ?? '').trim().toUpperCase();

  const subtotal = items.reduce(
    (sum, i) => sum + Math.round(i.unit_price_cents * i.quantity),
    0
  );

  // A code typed at the counter is looked up directly — the customer may not
  // even have an account, so the referral rules don't apply here.
  let promo = null;
  if (code) {
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();
    if (!data) return { error: `Code ${code} was not recognised.` };
    promo = data;
  }

  const discount = discountFor(promo, subtotal);

  let customerId = null;
  let customerName = String(formData.get('customer_name') ?? '').trim() || null;
  let customerPhone = String(formData.get('customer_phone') ?? '').trim() || null;

  if (bookingId) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('customer_id, vehicles(make, model, registration), profiles!bookings_customer_id_fkey(full_name, phone)')
      .eq('id', bookingId)
      .maybeSingle();

    if (booking) {
      customerId = booking.customer_id;
      customerName ??= booking.profiles?.full_name ?? null;
      customerPhone ??= booking.profiles?.phone ?? null;
    }
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      booking_id: bookingId,
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone,
      vehicle_note: String(formData.get('vehicle_note') ?? '').trim() || null,
      status: 'issued',
      promotion_id: promo?.id ?? null,
      subtotal_cents: subtotal,
      discount_cents: discount,
      total_cents: subtotal - discount,
      notes: String(formData.get('notes') ?? '').trim() || null,
      issued_by: profile.id,
      issued_at: new Date().toISOString(),
    })
    .select('id, number')
    .single();

  if (error) return { error: error.message };

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(items.map((i) => ({ ...i, invoice_id: invoice.id })));

  if (itemsError) return { error: itemsError.message };

  if (promo) {
    await supabase.from('promotion_redemptions').insert({
      promotion_id: promo.id,
      booking_id: bookingId,
      customer_id: customerId ?? profile.id,
      discount_cents: discount,
    });
  }

  revalidatePath('/worker/billing');
  redirect(`/worker/billing/${invoice.id}`);
}

/**
 * Raises a request on the card machine.
 *
 * Whether the amount actually appears on the terminal depends on the machine:
 * with an API it is pushed, without one the tablet shows it to be keyed in.
 * Either way the request is recorded, so takings reconcile the same way.
 */
export async function requestCardPayment(_prevState, formData) {
  const { profile } = await requireRole(TEAM);
  const supabase = createClient();

  const invoiceId = String(formData.get('invoice_id') ?? '');
  const terminalCode = String(formData.get('terminal_code') ?? '').trim() || null;

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, number, total_cents, paid_cents')
    .eq('id', invoiceId)
    .maybeSingle();

  if (!invoice) return { error: 'That bill no longer exists.' };

  const outstanding = Number(invoice.total_cents) - Number(invoice.paid_cents);
  if (outstanding <= 0) return { error: 'This bill is already settled.' };

  const { data: request, error } = await supabase
    .from('terminal_requests')
    .insert({
      invoice_id: invoice.id,
      terminal_code: terminalCode,
      requested_by: profile.id,
      amount_cents: outstanding,
      provider: 'webxpay',
      return_path: `/worker/billing/${invoice.id}`,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  const terminal = getTerminal('webxpay');
  try {
    const result = await terminal.send({
      amountCents: outstanding,
      reference: invoice.number,
      terminalCode,
    });

    if (result.delivered) {
      await supabase
        .from('terminal_requests')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', request.id);
    }
  } catch (err) {
    await supabase
      .from('terminal_requests')
      .update({ status: 'declined', failure_reason: err.message })
      .eq('id', request.id);
    return { error: err.message };
  }

  revalidatePath(`/worker/billing/${invoice.id}`);
  redirect(`/worker/billing/${invoice.id}/pay/${request.id}`);
}

/**
 * The mechanic confirms what the machine did.
 *
 * On a pushed terminal this is replaced by the gateway callback; on a manual
 * one it is the mechanic saying "it went through", which is the same promise
 * a paper slip makes.
 */
export async function settleTerminalRequest(_prevState, formData) {
  const { profile } = await requireRole(TEAM);
  const supabase = createClient();

  const requestId = String(formData.get('request_id') ?? '');
  const outcome = String(formData.get('outcome') ?? '');
  const reference = String(formData.get('provider_reference') ?? '').trim() || null;

  const { data: request } = await supabase
    .from('terminal_requests')
    .select('id, invoice_id, amount_cents, provider, status')
    .eq('id', requestId)
    .maybeSingle();

  if (!request) return { error: 'That payment request no longer exists.' };
  if (request.status === 'paid') return { error: 'This one is already settled.' };

  if (outcome === 'paid') {
    const { error: payError } = await supabase.from('payments').insert({
      booking_id: null,
      invoice_id: request.invoice_id,
      provider: request.provider,
      status: 'paid',
      amount_cents: request.amount_cents,
      provider_reference: reference,
      paid_at: new Date().toISOString(),
    });
    if (payError) return { error: payError.message };
  }

  await supabase
    .from('terminal_requests')
    .update({
      status: outcome === 'paid' ? 'paid' : outcome === 'cancelled' ? 'cancelled' : 'declined',
      provider_reference: reference,
      settled_at: new Date().toISOString(),
      failure_reason:
        outcome === 'paid' ? null : String(formData.get('reason') ?? '').trim() || null,
    })
    .eq('id', requestId);

  revalidatePath(`/worker/billing/${request.invoice_id}`);
  redirect(`/worker/billing/${request.invoice_id}?settled=${outcome}`);
}

/** Cash or transfer taken at the counter, against a bill. */
export async function recordCounterPayment(_prevState, formData) {
  await requireRole(TEAM);
  const supabase = createClient();

  const invoiceId = String(formData.get('invoice_id') ?? '');
  const rupees = Number(formData.get('amount_lkr') ?? 0);
  const provider = String(formData.get('provider') ?? 'cash');

  if (!Number.isFinite(rupees) || rupees <= 0) return { error: 'Enter an amount.' };

  const { error } = await supabase.from('payments').insert({
    invoice_id: invoiceId,
    provider,
    status: 'paid',
    amount_cents: Math.round(rupees * 100),
    provider_reference: String(formData.get('provider_reference') ?? '').trim() || null,
    paid_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath(`/worker/billing/${invoiceId}`);
  return { success: true };
}

/**
 * Refunds part or all of a payment.
 *
 * The original payment is never edited — a refund is its own row, so the
 * ledger stays append-only and every figure can be traced to who did what.
 */
export async function refundPayment(_prevState, formData) {
  const { profile } = await requireRole(TEAM);
  const supabase = createClient();

  const paymentId = String(formData.get('payment_id') ?? '');
  const rupees = Number(formData.get('amount_lkr') ?? 0);
  const reason = String(formData.get('reason') ?? '').trim();

  if (!Number.isFinite(rupees) || rupees <= 0) return { error: 'Enter an amount to refund.' };
  if (!reason) return { error: 'Say why this is being refunded — it goes on the record.' };

  const { data: payment } = await supabase
    .from('payments')
    .select('id, invoice_id, amount_cents, provider')
    .eq('id', paymentId)
    .maybeSingle();

  if (!payment) return { error: 'That payment no longer exists.' };

  const { data: already } = await supabase
    .from('refunds')
    .select('amount_cents')
    .eq('payment_id', paymentId);

  const refundedSoFar = (already ?? []).reduce((sum, r) => sum + Number(r.amount_cents), 0);
  const amountCents = Math.round(rupees * 100);

  if (refundedSoFar + amountCents > Number(payment.amount_cents)) {
    return { error: 'That is more than is left on this payment.' };
  }

  const { error } = await supabase.from('refunds').insert({
    payment_id: payment.id,
    invoice_id: payment.invoice_id,
    amount_cents: amountCents,
    reason,
    provider_reference: String(formData.get('provider_reference') ?? '').trim() || null,
    refunded_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/worker/billing/${payment.invoice_id}`);
  return {
    success: true,
    notice:
      payment.provider === 'cash'
        ? 'Recorded. Hand the cash back from the till.'
        : 'Recorded here — process the refund on the card machine as well.',
  };
}

/** The team creates a promo code from the counter. */
export async function createTeamPromotion(_prevState, formData) {
  const { profile } = await requireRole(TEAM);
  const supabase = createClient();

  const name = String(formData.get('name') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const kind = String(formData.get('kind') ?? 'percent');
  const value = Number(formData.get('value') ?? 0);

  if (!name || !code) return { error: 'A code needs a name and a code.' };
  if (!Number.isFinite(value) || value <= 0) return { error: 'Enter what it is worth.' };

  // A percentage discount created at the counter is capped, so a mistyped
  // number cannot give a car away. Admin has no such limit.
  const WORKER_MAX_PERCENT = 25;
  if (kind === 'percent') {
    if (value > 100) return { error: 'A percentage cannot exceed 100%.' };
    if (profile.role !== 'admin' && value > WORKER_MAX_PERCENT) {
      return {
        error: `Codes made at the counter cap at ${WORKER_MAX_PERCENT}%. Ask an admin for more than that.`,
      };
    }
  }

  const { error } = await supabase.from('promotions').insert({
    name,
    code,
    description: String(formData.get('description') ?? '').trim() || null,
    trigger: 'code',
    kind,
    value: kind === 'percent' ? Math.round(value) : Math.round(value * 100),
    ends_on: String(formData.get('ends_on') ?? '') || null,
    usage_limit: Number(formData.get('usage_limit') ?? 0) || null,
    per_customer_limit: Number(formData.get('per_customer_limit') ?? 1) || 1,
    is_active: true,
    created_by: profile.id,
  });

  if (error) {
    return {
      error: error.code === '23505' ? 'That code is already in use.' : error.message,
    };
  }

  revalidatePath('/worker/billing/codes');
  revalidatePath('/admin/promotions');
  return { success: true };
}
