import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../../nav';
import { OPEN_STATUSES, startOfToday, endOfToday } from '@/lib/tickets';
import InvoiceBuilder from './InvoiceBuilder';

export const metadata = { title: 'New bill' };

export default async function NewInvoicePage({ searchParams }) {
  const { profile } = await requireRole(['worker', 'admin'], { from: '/worker/billing/new' });
  const supabase = createClient();

  const [{ data: services }, { data: bookings }, { data: mechanics }, { data: tickets }] =
    await Promise.all([
    supabase
      .from('services')
      .select('id, name, base_price_cents')
      .eq('is_active', true)
      .order('sort_order'),
    // Today's bookings only. A list going back weeks is noise when
    // somebody is standing at the counter waiting to pay.
    supabase
      .from('bookings')
      .select('id, reference, scheduled_for, vehicles(make, model, registration), profiles!bookings_customer_id_fkey(full_name, phone, email)')
      .gte('scheduled_for', startOfToday().toISOString())
      .lte('scheduled_for', endOfToday().toISOString())
      .in('status', ['in_progress', 'awaiting_approval', 'awaiting_parts', 'completed'])
      .order('scheduled_for'),
    // Suggestions only — the name field takes anything, because plenty of
    // the people who do the work here have no account.
    supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['worker', 'admin'])
      .eq('is_active', true)
      .order('full_name'),
    // Cars actually in the workshop. This is what a walk-in usually is —
    // somebody who dropped the car off this morning and has come back for
    // it, so their details are already typed and shouldn't be typed again.
    supabase
      .from('tickets')
      .select('id, number, registration, make, model, complaint, customer_name, customer_phone, contact_id, assigned_name, status')
      .in('status', OPEN_STATUSES)
      .is('invoice_id', null)
      .order('opened_at'),
  ]);

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/billing"
      title="New bill"
      subtitle="Against a job, or for a walk-in with no account."
    >
      <InvoiceBuilder
        services={services ?? []}
        bookings={bookings ?? []}
        preselectedBooking={searchParams?.booking ?? ''}
        mechanics={mechanics ?? []}
        tickets={tickets ?? []}
        preselectedTicket={searchParams?.ticket ?? ''}
      />
    </PortalShell>
  );
}
