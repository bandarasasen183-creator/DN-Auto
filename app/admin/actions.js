'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';

/** Admin moves a booking to any status and optionally assigns a mechanic. */
export async function updateBooking(_prevState, formData) {
  const { profile } = await requireRole('admin');
  const supabase = createClient();

  const id = String(formData.get('booking_id') ?? '');
  const status = String(formData.get('status') ?? '');
  const workerId = String(formData.get('assigned_worker_id') ?? '');
  const bayId = String(formData.get('bay_id') ?? '');
  const note = String(formData.get('internal_note') ?? '').trim();

  const patch = {};
  if (status) patch.status = status;
  // An empty select means "unassign", which is a real choice, not a no-op.
  patch.assigned_worker_id = workerId || null;
  patch.bay_id = bayId || null;
  if (note) patch.internal_notes = note;

  // Assigning someone without touching the status would leave the job looking
  // untouched to the worker, so nudge it forward.
  if (!status && workerId) patch.status = 'assigned';

  const { error } = await supabase.from('bookings').update(patch).eq('id', id);
  if (error) return { error: error.message };

  await supabase.from('booking_events').insert({
    booking_id: id,
    actor_id: profile.id,
    to_status: patch.status ?? null,
    message: workerId ? 'Assigned to a mechanic' : 'Updated by the workshop',
  });

  revalidatePath('/admin/bookings');
  revalidatePath(`/admin/bookings/${id}`);
  return { success: true };
}

/** Create or update a service and its LKR guide price. */
export async function saveService(_prevState, formData) {
  await requireRole('admin');
  const supabase = createClient();

  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const rupees = Number(formData.get('price_lkr') ?? 0);

  if (!name) return { error: 'A service needs a name.' };
  if (!Number.isFinite(rupees) || rupees < 0) {
    return { error: 'Enter the price in rupees, as a number.' };
  }

  const row = {
    name,
    description: String(formData.get('description') ?? '').trim() || null,
    category: String(formData.get('category') ?? '').trim() || null,
    // The form takes rupees; the database stores cents.
    base_price_cents: Math.round(rupees * 100),
    duration_minutes: Number(formData.get('duration_minutes') ?? 60),
    is_active: formData.get('is_active') === 'on',
    price_is_from: formData.get('price_is_from') === 'on',
  };

  const { error } = id
    ? await supabase.from('services').update(row).eq('id', id)
    : await supabase.from('services').insert({
        ...row,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      });

  if (error) return { error: error.message };

  revalidatePath('/admin/services');
  revalidatePath('/');
  return { success: true };
}

/** Promote or demote a user. The only way to create staff. */
export async function setUserRole(formData) {
  const { profile } = await requireRole('admin');
  const supabase = createClient();

  const userId = String(formData.get('user_id') ?? '');
  const role = String(formData.get('role') ?? '');

  if (!['customer', 'worker', 'admin'].includes(role)) return;
  // An admin demoting themselves would lock the workshop out of its own admin.
  if (userId === profile.id) return;

  await supabase.from('profiles').update({ role }).eq('id', userId);

  // A worker needs a row in `workers` to hold their rate and specialities.
  if (role === 'worker') {
    await supabase.from('workers').upsert({ id: userId }, { onConflict: 'id' });
  }

  revalidatePath('/admin/workers');
  revalidatePath('/admin/customers');
}

/** Suspend or restore an account without deleting its history. */
export async function setUserActive(formData) {
  const { profile } = await requireRole('admin');
  const supabase = createClient();

  const userId = String(formData.get('user_id') ?? '');
  const isActive = formData.get('is_active') === 'true';

  if (userId === profile.id) return;

  await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);
  revalidatePath('/admin/workers');
  revalidatePath('/admin/customers');
}

/** Record a payment against a booking, whatever channel it came through. */
export async function recordPayment(_prevState, formData) {
  await requireRole('admin');
  const supabase = createClient();

  const bookingId = String(formData.get('booking_id') ?? '');
  const rupees = Number(formData.get('amount_lkr') ?? 0);
  const provider = String(formData.get('provider') ?? 'cash');
  const reference = String(formData.get('provider_reference') ?? '').trim();

  if (!bookingId) return { error: 'Choose a booking.' };
  if (!Number.isFinite(rupees) || rupees <= 0) return { error: 'Enter an amount.' };

  const { error } = await supabase.from('payments').insert({
    booking_id: bookingId,
    provider,
    status: 'paid',
    amount_cents: Math.round(rupees * 100),
    provider_reference: reference || null,
    paid_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/payments');
  revalidatePath('/admin');
  return { success: true };
}

/** Build a quote for a booking from free-text line items. */
export async function createQuote(_prevState, formData) {
  const { profile } = await requireRole('admin');
  const supabase = createClient();

  const bookingId = String(formData.get('booking_id') ?? '');
  const descriptions = formData.getAll('item_description').map(String);
  const prices = formData.getAll('item_price').map(Number);
  const kinds = formData.getAll('item_kind').map(String);

  const items = descriptions
    .map((description, i) => ({
      description: description.trim(),
      kind: kinds[i] ?? 'labour',
      unit_price_cents: Math.round((prices[i] || 0) * 100),
      // Parts carry the workshop's standing 6-month warranty; labour doesn't.
      warranty_months: (kinds[i] ?? 'labour') === 'part' ? 6 : 0,
      sort_order: i,
    }))
    .filter((item) => item.description && item.unit_price_cents > 0);

  if (!bookingId || items.length === 0) {
    return { error: 'Add at least one line item with a price.' };
  }

  const subtotal = items.reduce((sum, i) => sum + i.unit_price_cents, 0);

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      booking_id: bookingId,
      status: 'sent',
      subtotal_cents: subtotal,
      total_cents: subtotal,
      created_by: profile.id,
      notes: String(formData.get('notes') ?? '').trim() || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  const { error: itemsError } = await supabase
    .from('quote_items')
    .insert(items.map((i) => ({ ...i, quote_id: quote.id })));

  if (itemsError) return { error: itemsError.message };

  await supabase
    .from('bookings')
    .update({ status: 'awaiting_approval' })
    .eq('id', bookingId);

  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: true };
}
