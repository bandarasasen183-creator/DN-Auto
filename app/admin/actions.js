'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { discountFor } from '@/lib/promotions';

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

  // Whatever promotion the customer booked with follows them onto the quote,
  // recalculated against the real figure rather than the guide price.
  const { data: booking } = await supabase
    .from('bookings')
    .select('promotion_id, promotions(kind, value, max_discount_cents, min_spend_cents)')
    .eq('id', bookingId)
    .maybeSingle();

  const discount = discountFor(booking?.promotions ?? null, subtotal);

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      booking_id: bookingId,
      status: 'sent',
      subtotal_cents: subtotal,
      discount_cents: discount,
      total_cents: subtotal - discount,
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

/** Publish or hide a review on the public site. */
export async function setReviewPublished(formData) {
  await requireRole('admin');
  const supabase = createClient();

  await supabase
    .from('reviews')
    .update({ is_published: formData.get('publish') === 'true' })
    .eq('id', String(formData.get('review_id') ?? ''));

  revalidatePath('/admin/reviews');
  revalidatePath('/');
}

/** The workshop's public reply to a review. */
export async function replyToReview(_prevState, formData) {
  await requireRole('admin');
  const supabase = createClient();

  const reply = String(formData.get('reply') ?? '').trim();
  const { error } = await supabase
    .from('reviews')
    .update({ reply: reply || null })
    .eq('id', String(formData.get('review_id') ?? ''));

  if (error) return { error: error.message };

  revalidatePath('/admin/reviews');
  revalidatePath('/');
  return { success: true };
}

/** Contact details and the site-wide announcement, without a code change. */
export async function saveWorkshopSettings(_prevState, formData) {
  await requireRole('admin');
  const supabase = createClient();

  const { error } = await supabase
    .from('workshop_settings')
    .update({
      phone: String(formData.get('phone') ?? '').trim() || null,
      whatsapp: String(formData.get('whatsapp') ?? '').trim() || null,
      email: String(formData.get('email') ?? '').trim() || null,
      announcement: String(formData.get('announcement') ?? '').trim() || null,
      accepting_bookings: formData.get('accepting_bookings') === 'on',
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) return { error: error.message };

  // The banner and contact details show on every page.
  revalidatePath('/', 'layout');
  return { success: true };
}

/** Create or update a promotion. Admin owns every discount the site offers. */
export async function savePromotion(_prevState, formData) {
  await requireRole('admin');
  const supabase = createClient();

  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const kind = String(formData.get('kind') ?? 'percent');
  const trigger = String(formData.get('trigger') ?? 'code');
  const rawValue = Number(formData.get('value') ?? 0);

  if (!name) return { error: 'Give the promotion a name.' };
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return { error: 'Enter how much the discount is worth.' };
  }
  if (kind === 'percent' && rawValue > 100) {
    return { error: 'A percentage discount cannot be more than 100%.' };
  }

  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  if (trigger === 'code' && !code) {
    return { error: 'A code promotion needs a code for customers to type.' };
  }

  const maxDiscount = Number(formData.get('max_discount_lkr') ?? 0);
  const minSpend = Number(formData.get('min_spend_lkr') ?? 0);

  const row = {
    name,
    description: String(formData.get('description') ?? '').trim() || null,
    // Automatic promotions have no code; a stray one would be confusing.
    code: trigger === 'code' || trigger === 'referral' ? code || null : null,
    trigger,
    kind,
    // Percent is stored whole; fixed amounts are LKR cents like everything else.
    value: kind === 'percent' ? Math.round(rawValue) : Math.round(rawValue * 100),
    max_discount_cents: maxDiscount > 0 ? Math.round(maxDiscount * 100) : null,
    min_spend_cents: minSpend > 0 ? Math.round(minSpend * 100) : 0,
    starts_on: String(formData.get('starts_on') ?? '') || null,
    ends_on: String(formData.get('ends_on') ?? '') || null,
    usage_limit: Number(formData.get('usage_limit') ?? 0) || null,
    per_customer_limit: Number(formData.get('per_customer_limit') ?? 1) || 1,
    is_active: formData.get('is_active') === 'on',
  };

  const { error } = id
    ? await supabase.from('promotions').update(row).eq('id', id)
    : await supabase.from('promotions').insert(row);

  if (error) {
    return {
      error: error.code === '23505'
        ? 'That code is already in use by another promotion.'
        : error.message,
    };
  }

  revalidatePath('/admin/promotions');
  revalidatePath('/');
  return { success: true };
}

/** Switch a promotion on or off without deleting its history. */
export async function togglePromotion(formData) {
  await requireRole('admin');
  const supabase = createClient();

  await supabase
    .from('promotions')
    .update({ is_active: formData.get('active') === 'true' })
    .eq('id', String(formData.get('promotion_id') ?? ''));

  revalidatePath('/admin/promotions');
  revalidatePath('/');
}
