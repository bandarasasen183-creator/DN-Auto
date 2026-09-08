import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../../nav';
import { startOfToday, endOfToday } from '@/lib/tickets';
import TicketForm from './TicketForm';

export const metadata = { title: 'Car arrived' };

export default async function NewTicketPage({ searchParams }) {
  const { profile } = await requireRole(['worker', 'admin'], { from: '/worker/tickets/new' });
  const supabase = createClient();

  const [{ data: mechanics }, { data: bookings }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['worker', 'admin'])
      .eq('is_active', true)
      .order('full_name'),
    // Only today's bookings. A list of every future booking is noise when
    // somebody is standing at the counter with their keys out.
    supabase
      .from('bookings')
      .select('id, reference, scheduled_for, vehicles(make, model, registration), profiles!bookings_customer_id_fkey(full_name, phone)')
      .gte('scheduled_for', startOfToday().toISOString())
      .lte('scheduled_for', endOfToday().toISOString())
      .in('status', ['confirmed', 'pending', 'in_progress'])
      .order('scheduled_for'),
  ]);

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/tickets"
      title="Car arrived"
      subtitle="Booked or not — this is what opens the job."
    >
      <TicketForm
        mechanics={mechanics ?? []}
        bookings={bookings ?? []}
        preselectedBooking={searchParams?.booking ?? ''}
      />
    </PortalShell>
  );
}
