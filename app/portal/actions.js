'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { validateSlot, findOutOfScope } from '@/lib/business';

/** Creates a vehicle and returns it, or returns an existing match. */
async function upsertVehicle(supabase, ownerId, { make, model, year, registration }) {
  const registrationNo = registration.trim().toUpperCase();

  const { data: existing } = await supabase
    .from('vehicles')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('registration', registrationNo)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      owner_id: ownerId,
      make: make.trim(),
      model: model.trim(),
      year: year ? Number(year) : null,
      registration: registrationNo,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function createBooking(_prevState, formData) {
  const { profile } = await requireRole('customer');
  const supabase = createClient();

  const serviceId = String(formData.get('service_id') ?? '');
  const make = String(formData.get('make') ?? '').trim();
  const model = String(formData.get('model') ?? '').trim();
  const year = String(formData.get('year') ?? '').trim();
  const registration = String(formData.get('registration') ?? '').trim();
  const date = String(formData.get('date') ?? '');
  const time = String(formData.get('time') ?? '');
  const notes = String(formData.get('notes') ?? '').trim();

  if (!serviceId) return { error: 'Please choose a service.' };
  if (!make || !model || !registration) {
    return { error: 'Please give us your vehicle make, model and registration number.' };
  }
  if (!date || !time) return { error: 'Please choose a date and time.' };

  // Refuse work we don't do, in the customer's own words, before it reaches
  // the workshop diary.
  const outOfScope = findOutOfScope(`${notes} ${make} ${model}`);
  if (outOfScope) {
    return {
      error: `We don't take on ${outOfScope}. Everything else on your vehicle we're happy to look at — just remove that part of the request.`,
    };
  }

  const scheduledFor = new Date(`${date}T${time}`);

  // Sunday only online — validateSlot refuses weekday evenings and points the
  // customer at the phone, because an emergency needs a human to confirm it.
  const slot = validateSlot(scheduledFor);
  if (!slot.ok) return { error: slot.reason };

  let vehicleId;
  try {
    vehicleId = await upsertVehicle(supabase, profile.id, { make, model, year, registration });
  } catch (err) {
    return { error: `We couldn't save your vehicle: ${err.message}` };
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: profile.id,
      vehicle_id: vehicleId,
      service_id: serviceId,
      scheduled_for: scheduledFor.toISOString(),
      is_emergency: Boolean(slot.isEmergency),
      customer_notes: notes || null,
      status: 'requested',
    })
    .select('reference')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/portal');
  revalidatePath('/portal/bookings');
  return { success: true, reference: data.reference };
}

export async function cancelBooking(_prevState, formData) {
  const { profile } = await requireRole('customer');
  const supabase = createClient();

  const id = String(formData.get('booking_id') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || 'Cancelled by customer',
    })
    .eq('id', id)
    .eq('customer_id', profile.id)
    // Once the workshop has picked the job up, cancelling is a phone call.
    .in('status', ['requested', 'confirmed']);

  if (error) return { error: error.message };

  revalidatePath('/portal/bookings');
  revalidatePath(`/portal/bookings/${id}`);
  return { success: true };
}

export async function respondToQuote(_prevState, formData) {
  await requireRole('customer');
  const supabase = createClient();

  const quoteId = String(formData.get('quote_id') ?? '');
  const decision = String(formData.get('decision') ?? '');

  if (!['approved', 'rejected'].includes(decision)) {
    return { error: 'Unknown response.' };
  }

  // RLS restricts this to quotes on the caller's own bookings, in 'sent'.
  const { error } = await supabase
    .from('quotes')
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq('id', quoteId);

  if (error) return { error: error.message };

  revalidatePath('/portal/quotes');
  return { success: true, decision };
}

export async function addVehicle(_prevState, formData) {
  const { profile } = await requireRole('customer');
  const supabase = createClient();

  const make = String(formData.get('make') ?? '').trim();
  const model = String(formData.get('model') ?? '').trim();
  const registration = String(formData.get('registration') ?? '').trim();
  const year = String(formData.get('year') ?? '').trim();

  if (!make || !model || !registration) {
    return { error: 'Make, model and registration are required.' };
  }

  try {
    await upsertVehicle(supabase, profile.id, { make, model, year, registration });
  } catch (err) {
    return { error: err.message };
  }

  revalidatePath('/portal/vehicles');
  return { success: true };
}

export async function removeVehicle(formData) {
  const { profile } = await requireRole('customer');
  const supabase = createClient();
  await supabase
    .from('vehicles')
    .delete()
    .eq('id', String(formData.get('vehicle_id') ?? ''))
    .eq('owner_id', profile.id);
  revalidatePath('/portal/vehicles');
}

/** A customer reviews a completed job. Published only once admin approves. */
export async function submitReview(_prevState, formData) {
  const { profile } = await requireRole('customer');
  const supabase = createClient();

  const bookingId = String(formData.get('booking_id') ?? '');
  const rating = Number(formData.get('rating') ?? 0);
  const body = String(formData.get('body') ?? '').trim();

  if (!bookingId) return { error: 'Which job is this about?' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Please give a rating from 1 to 5.' };
  }

  // RLS also enforces "your own booking, and completed" — this is the
  // friendlier version of the same rule.
  const { error } = await supabase.from('reviews').insert({
    booking_id: bookingId,
    author_id: profile.id,
    rating,
    body: body || null,
  });

  if (error) {
    return {
      error: error.code === '23505'
        ? 'You have already reviewed this job.'
        : error.message,
    };
  }

  revalidatePath('/portal/bookings');
  revalidatePath(`/portal/bookings/${bookingId}`);
  return { success: true };
}

/** Update the signed-in customer's own name and phone. */
export async function updateProfile(_prevState, formData) {
  const { profile } = await requireRole(['customer', 'worker', 'admin']);
  const supabase = createClient();

  const fullName = String(formData.get('full_name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();

  if (!fullName) return { error: 'Your name cannot be blank.' };

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone: phone || null })
    .eq('id', profile.id);

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return { success: true };
}

/** Change password for whoever is signed in. */
export async function changePassword(_prevState, formData) {
  await requireRole(['customer', 'worker', 'admin']);
  const supabase = createClient();

  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 8) return { error: 'Use at least 8 characters.' };
  if (password !== confirm) return { error: 'The two passwords do not match.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: true, notice: 'Password changed.' };
}

/** Mark every unread notification as read. */
export async function markAllNotificationsRead() {
  const { profile } = await requireRole(['customer', 'worker', 'admin']);
  const supabase = createClient();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', profile.id)
    .is('read_at', null);
  revalidatePath('/portal/notifications');
}
