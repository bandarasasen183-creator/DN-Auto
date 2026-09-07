'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { getTerminal } from '@/lib/payments/terminal';
import { discountFor } from '@/lib/promotions';
import { BUSINESS } from '@/lib/business';
import { sendEmail, EmailNotConfiguredError } from '@/lib/email';
import {
  fetchServiceHistory,
  renderServiceHistoryEmail,
  formatPlate,
} from '@/lib/service-history';

const TEAM = ['worker', 'admin'];

/**
 * What a line carries by default: parts get the workshop's standing
 * warranty, labour gets none. The counter can override either way.
 */
function defaultWarrantyFor(kind) {
  return kind === 'part' ? BUSINESS.partsWarrantyMonths : 0;
}

/**
 * Reads the line items out of the form and totals them.
 *
 * The warranty on a line is whatever the mechanic set, not whatever the
 * kind implies — a supplier's twelve months, a used part with none, or a
 * gearbox rebuild carrying cover on the labour are all real, and the form
 * only pre-fills the usual answer rather than deciding it.
 */
function readItems(formData) {
  const descriptions = formData.getAll('item_description').map(String);
  const prices = formData.getAll('item_price').map(Number);
  const quantities = formData.getAll('item_quantity').map(Number);
  const kinds = formData.getAll('item_kind').map(String);
  const warranties = formData.getAll('item_warranty_months');

  return descriptions
    .map((description, i) => {
      const kind = kinds[i] ?? 'labour';
      // An empty box means "the usual"; a typed 0 means "explicitly none".
      const typed = warranties[i];
      const months =
        typed === undefined || String(typed).trim() === ''
          ? defaultWarrantyFor(kind)
          : Math.max(0, Math.round(Number(typed) || 0));

      return {
        description: description.trim(),
        kind,
        quantity: Number.isFinite(quantities[i]) && quantities[i] > 0 ? quantities[i] : 1,
        unit_price_cents: Math.round((prices[i] || 0) * 100),
        warranty_months: months,
        sort_order: i,
      };
    })
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
  let customerEmail = String(formData.get('customer_email') ?? '').trim() || null;
  let registration = formatPlate(formData.get('registration')) || null;

  if (bookingId) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('customer_id, vehicles(make, model, registration), profiles!bookings_customer_id_fkey(full_name, phone, email)')
      .eq('id', bookingId)
      .maybeSingle();

    if (booking) {
      customerId = booking.customer_id;
      customerName ??= booking.profiles?.full_name ?? null;
      customerPhone ??= booking.profiles?.phone ?? null;
      customerEmail ??= booking.profiles?.email ?? null;
      // The plate on the job wins only if nobody typed one at the counter —
      // a car can arrive on different plates to the one we have on file.
      registration ??= formatPlate(booking.vehicles?.registration) || null;
    }
  }

  // Who did the work is typed, not picked — most of the people who turn a
  // spanner here have no login. If the name happens to match a staff
  // account we link it, which makes "show me this mechanic's jobs" work
  // without forcing everyone through a sign-up they don't need.
  const performedByName = String(formData.get('performed_by_name') ?? '').trim() || null;
  let performedBy = null;
  if (performedByName) {
    const { data: match } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', performedByName)
      .in('role', ['worker', 'admin'])
      .maybeSingle();
    performedBy = match?.id ?? null;
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      booking_id: bookingId,
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      registration,
      performed_by: performedBy,
      performed_by_name: performedByName,
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
    .select('id, number, notes')
    .single();

  if (error) return { error: error.message };

  const { data: savedItems, error: itemsError } = await supabase
    .from('invoice_items')
    .insert(items.map((i) => ({ ...i, invoice_id: invoice.id })))
    .select('id, description, warranty_months, sort_order');

  if (itemsError) return { error: itemsError.message };

  // Every line sold with cover becomes a warranty in its own right, so the
  // register can answer "what is still covered on this car?" without
  // re-reading old bills. Needs a plate — cover follows the vehicle, and
  // without one there is nothing to look it up by later.
  if (registration) {
    const covered = (savedItems ?? [])
      .filter((item) => item.warranty_months > 0)
      .map((item) => ({
        invoice_id: invoice.id,
        invoice_item_id: item.id,
        registration,
        description: item.description,
        months: item.warranty_months,
        fitted_by: performedBy,
        fitted_by_name: performedByName ?? profile.full_name ?? null,
      }));

    if (covered.length > 0) {
      const { error: warrantyError } = await supabase.from('warranties').insert(covered);
      // A failure here must not lose the bill — the money is the urgent part.
      // It is surfaced on the receipt instead, where somebody can fix it.
      if (warrantyError) {
        await supabase
          .from('invoices')
          .update({
            notes: [invoice.notes, `Warranty records failed to save: ${warrantyError.message}`]
              .filter(Boolean)
              .join(' · '),
          })
          .eq('id', invoice.id);
      }
    }
  }

  if (promo) {
    await supabase.from('promotion_redemptions').insert({
      promotion_id: promo.id,
      booking_id: bookingId,
      customer_id: customerId ?? profile.id,
      discount_cents: discount,
    });
  }

  revalidatePath('/worker/billing');
  // Straight to the handover screen — the bill exists, now it gets paid for
  // and signed. The receipt is what comes after that, not before.
  redirect(`/worker/billing/${invoice.id}/confirm`);
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

/**
 * Handover: records how the customer paid and captures their signature.
 *
 * WEBXPAY have confirmed the card machine has no API, so the terminal and
 * this app are two separate systems that meet at a person. That person
 * says what the machine did, and the customer signs to say they agree.
 * Without the signature this is one member of staff's word; with it, the
 * bill carries the customer's own confirmation of what they paid.
 */
export async function completeHandover(_prevState, formData) {
  const { profile } = await requireRole(TEAM);
  const supabase = createClient();

  const invoiceId = String(formData.get('invoice_id') ?? '');
  const method = String(formData.get('method') ?? 'cash');
  const rupees = Number(formData.get('amount_lkr') ?? 0);
  const signature = String(formData.get('signature') ?? '');
  const signedName = String(formData.get('signed_name') ?? '').trim() || null;
  const reference = String(formData.get('provider_reference') ?? '').trim() || null;

  if (!Number.isFinite(rupees) || rupees <= 0) return { error: 'Enter what was paid.' };
  if (!signature.startsWith('data:image/png')) {
    return { error: 'Ask the customer to sign before finishing.' };
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, total_cents, paid_cents')
    .eq('id', invoiceId)
    .maybeSingle();

  if (!invoice) return { error: 'That bill no longer exists.' };

  const { error: payError } = await supabase.from('payments').insert({
    invoice_id: invoice.id,
    provider: method,
    status: 'paid',
    amount_cents: Math.round(rupees * 100),
    provider_reference: reference,
    paid_at: new Date().toISOString(),
  });

  if (payError) return { error: payError.message };

  const { error } = await supabase
    .from('invoices')
    .update({
      signature_png: signature,
      signed_name: signedName,
      signed_at: new Date().toISOString(),
    })
    .eq('id', invoice.id);

  if (error) return { error: error.message };

  revalidatePath(`/worker/billing/${invoice.id}`);
  return { success: true, signedBy: profile.full_name ?? null };
}

/**
 * A member of staff takes the tablet back.
 *
 * The screen the customer is left looking at shows a tick and nothing
 * else — no totals, no other jobs, no way back into the portal — because
 * they are holding a device that can see every customer we have. This is
 * the step that ends that, and it is recorded so "who closed this off?"
 * has an answer.
 */
export async function releaseHandover(_prevState, formData) {
  const { profile } = await requireRole(TEAM);
  const supabase = createClient();

  const invoiceId = String(formData.get('invoice_id') ?? '');

  await supabase
    .from('invoices')
    .update({ handed_back_at: new Date().toISOString(), handed_back_by: profile.id })
    .eq('id', invoiceId);

  revalidatePath(`/worker/billing/${invoiceId}`);
  redirect(`/worker/billing/${invoiceId}?settled=paid`);
}

/**
 * Emails a vehicle's service history to the customer.
 *
 * Sent against the registration rather than the bill, so a customer gets
 * everything we have ever done to that car, not just today's line items.
 * Every send is written to `messages` — a customer who says "you never
 * sent it" is answerable from the record rather than from memory.
 */
export async function emailServiceHistory(_prevState, formData) {
  await requireRole(TEAM);
  const supabase = createClient();

  const invoiceId = String(formData.get('invoice_id') ?? '') || null;
  const to = String(formData.get('email') ?? '').trim();
  const registration = formatPlate(formData.get('registration'));

  if (!to || !to.includes('@')) return { error: 'Enter an email address to send it to.' };
  if (!registration) {
    return {
      error:
        'This bill has no registration on it, so there is nothing to look the ' +
        'history up by. Add the plate to the bill first.',
    };
  }

  const history = await fetchServiceHistory(supabase, registration);
  const customerName = String(formData.get('customer_name') ?? '').trim() || null;
  const { subject, html } = renderServiceHistoryEmail({
    registration,
    history,
    customerName,
  });

  let providerReference = null;
  let status = 'sent';
  let failure = null;
  let notConfigured = false;

  try {
    const result = await sendEmail({ to, subject, html, replyTo: BUSINESS.contact.email });
    providerReference = result.id;
  } catch (err) {
    status = 'failed';
    failure = err.message;
    notConfigured = err instanceof EmailNotConfiguredError;
  }

  await supabase.from('messages').insert({
    invoice_id: invoiceId,
    channel: 'email',
    kind: 'service_history',
    to_email: to,
    subject,
    body: `Service history for ${registration} (${history.invoices.length} visits, ${history.warranties.length} warranties)`,
    status,
    provider: 'resend',
    provider_reference: providerReference,
    failure_reason: failure,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  });

  if (status === 'failed') {
    return { error: notConfigured ? failure : `Not sent — ${failure}` };
  }

  // Remember where it went, so the next send doesn't need retyping.
  if (invoiceId) {
    await supabase
      .from('invoices')
      .update({ customer_email: to })
      .eq('id', invoiceId)
      .is('customer_email', null);
    revalidatePath(`/worker/billing/${invoiceId}`);
  }

  return {
    success: true,
    notice: `Sent to ${to} — ${history.invoices.length} visit${
      history.invoices.length === 1 ? '' : 's'
    } on record.`,
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
