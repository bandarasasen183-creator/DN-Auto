'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';

/** Statuses a worker is allowed to move a job into. */
const WORKER_STATUSES = [
  'in_progress',
  'awaiting_parts',
  'awaiting_approval',
  'completed',
];

/**
 * A worker claims a job. Guarded twice: RLS only lets a worker touch rows
 * that are unassigned or already theirs, and the `is null` filter here makes
 * two mechanics tapping Accept at once a no-op for the loser rather than a
 * silent reassignment.
 */
export async function acceptJob(_prevState, formData) {
  const { profile } = await requireRole('worker');
  const supabase = createClient();

  const id = String(formData.get('booking_id') ?? '');

  const { data, error } = await supabase
    .from('bookings')
    .update({
      assigned_worker_id: profile.id,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('assigned_worker_id', null)
    .select('id')
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) {
    return { error: 'Another mechanic accepted this job first.' };
  }

  await supabase.from('booking_events').insert({
    booking_id: id,
    actor_id: profile.id,
    to_status: 'accepted',
    message: `${profile.full_name} accepted the job`,
  });

  revalidatePath('/worker');
  revalidatePath('/worker/incoming');
  revalidatePath('/worker/jobs');
  return { success: true };
}

/** Moves an assigned job along and writes a customer-visible note. */
export async function updateJobStatus(_prevState, formData) {
  const { profile } = await requireRole('worker');
  const supabase = createClient();

  const id = String(formData.get('booking_id') ?? '');
  const status = String(formData.get('status') ?? '');
  const note = String(formData.get('note') ?? '').trim();

  if (!WORKER_STATUSES.includes(status)) {
    return { error: 'That is not a status you can set.' };
  }

  const patch = { status };
  if (status === 'in_progress') patch.started_at = new Date().toISOString();
  if (status === 'completed') patch.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', id)
    .eq('assigned_worker_id', profile.id);

  if (error) return { error: error.message };

  if (note) {
    await supabase.from('booking_events').insert({
      booking_id: id,
      actor_id: profile.id,
      to_status: status,
      message: note,
    });
  }

  revalidatePath('/worker');
  revalidatePath('/worker/jobs');
  revalidatePath(`/worker/jobs/${id}`);
  return { success: true };
}
