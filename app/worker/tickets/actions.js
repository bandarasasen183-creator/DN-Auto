'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { formatPlate } from '@/lib/service-history';
import { NEXT_STATUS } from '@/lib/tickets';

const TEAM = ['worker', 'admin'];

/**
 * Finds or creates the contact for a walk-in.
 *
 * Matched on the digits of the phone number, so the same person is
 * recognised whether they wrote 0771234567 or +94 77 123 4567. We ask for
 * a number and nothing else — an email is offered, never required.
 */
async function upsertContact(supabase, { name, phone, email, marketingOptIn, serviceOptIn }) {
  if (!phone) return null;
  const key = phone.replace(/[^0-9]/g, '');
  if (!key) return null;

  const { data: existing } = await supabase
    .from('contacts')
    .select('id, full_name, email')
    .eq('phone_key', key)
    .maybeSingle();

  if (existing) {
    // Fill in what we didn't know, never overwrite what we did. A customer
    // giving a shorter version of their name on a busy Sunday should not
    // rewrite the record we already had.
    const patch = {};
    if (name && !existing.full_name) patch.full_name = name;
    if (email && !existing.email) patch.email = email;
    if (marketingOptIn || serviceOptIn) {
      if (marketingOptIn) {
        patch.marketing_opt_in = true;
        patch.marketing_opt_in_at = new Date().toISOString();
        patch.opt_in_source = 'walk-in ticket';
      }
      if (serviceOptIn) patch.service_updates_opt_in = true;
    }

    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      await supabase.from('contacts').update(patch).eq('id', existing.id);
    }
    return existing.id;
  }

  const { data: created } = await supabase
    .from('contacts')
    .insert({
      full_name: name || null,
      phone,
      email: email || null,
      marketing_opt_in: marketingOptIn,
      marketing_opt_in_at: marketingOptIn ? new Date().toISOString() : null,
      opt_in_source: marketingOptIn ? 'walk-in ticket' : null,
      service_updates_opt_in: serviceOptIn,
    })
    .select('id')
    .single();

  return created?.id ?? null;
}

/** Opens a ticket — the car is here. */
export async function openTicket(_prevState, formData) {
  const { profile } = await requireRole(TEAM);
  const supabase = createClient();

  const registration = formatPlate(formData.get('registration'));
  const complaint = String(formData.get('complaint') ?? '').trim();

  if (!registration) return { error: 'The registration is how this car is found again.' };
  if (!complaint) return { error: 'Write down what the customer says is wrong.' };

  const name = String(formData.get('customer_name') ?? '').trim();
  const phone = String(formData.get('customer_phone') ?? '').trim();

  const contactId = await upsertContact(supabase, {
    name,
    phone,
    email: String(formData.get('customer_email') ?? '').trim(),
    marketingOptIn: formData.get('marketing_opt_in') === 'yes',
    serviceOptIn: formData.get('service_updates_opt_in') === 'yes',
  });

  // A promise is only recorded if somebody made one.
  const promisedRaw = String(formData.get('promised_ready_at') ?? '').trim();

  const bookingId = String(formData.get('booking_id') ?? '') || null;
  let customerId = null;
  if (bookingId) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('customer_id')
      .eq('id', bookingId)
      .maybeSingle();
    customerId = booking?.customer_id ?? null;
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      registration,
      make: String(formData.get('make') ?? '').trim() || null,
      model: String(formData.get('model') ?? '').trim() || null,
      colour: String(formData.get('colour') ?? '').trim() || null,
      contact_id: contactId,
      customer_id: customerId,
      booking_id: bookingId,
      customer_name: name || null,
      customer_phone: phone || null,
      complaint,
      notes: String(formData.get('notes') ?? '').trim() || null,
      bay_id: String(formData.get('bay_id') ?? '') || null,
      assigned_name: String(formData.get('assigned_name') ?? '').trim() || null,
      keys_location: String(formData.get('keys_location') ?? '').trim() || null,
      promised_ready_at: promisedRaw ? new Date(promisedRaw).toISOString() : null,
      opened_by: profile.id,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/worker/tickets');
  redirect(`/worker/tickets/${ticket.id}`);
}

/**
 * Moves a ticket along.
 *
 * The allowed moves are declared in NEXT_STATUS and checked here rather
 * than trusted from the form — the buttons are a convenience, not the
 * rule.
 */
export async function moveTicket(_prevState, formData) {
  await requireRole(TEAM);
  const supabase = createClient();

  const ticketId = String(formData.get('ticket_id') ?? '');
  const status = String(formData.get('status') ?? '');

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, status')
    .eq('id', ticketId)
    .maybeSingle();

  if (!ticket) return { error: 'That ticket no longer exists.' };

  if (!(NEXT_STATUS[ticket.status] ?? []).includes(status)) {
    return { error: `A ticket cannot go from ${ticket.status} to ${status}.` };
  }

  const { error } = await supabase.from('tickets').update({ status }).eq('id', ticketId);
  if (error) return { error: error.message };

  revalidatePath('/worker/tickets');
  revalidatePath(`/worker/tickets/${ticketId}`);
  return { success: true };
}

/** Edits the working details of a ticket while the car is here. */
export async function updateTicket(_prevState, formData) {
  await requireRole(TEAM);
  const supabase = createClient();

  const ticketId = String(formData.get('ticket_id') ?? '');
  const promisedRaw = String(formData.get('promised_ready_at') ?? '').trim();

  const { error } = await supabase
    .from('tickets')
    .update({
      bay_id: String(formData.get('bay_id') ?? '') || null,
      assigned_name: String(formData.get('assigned_name') ?? '').trim() || null,
      keys_location: String(formData.get('keys_location') ?? '').trim() || null,
      notes: String(formData.get('notes') ?? '').trim() || null,
      promised_ready_at: promisedRaw ? new Date(promisedRaw).toISOString() : null,
    })
    .eq('id', ticketId);

  if (error) return { error: error.message };

  revalidatePath(`/worker/tickets/${ticketId}`);
  return { success: true };
}
