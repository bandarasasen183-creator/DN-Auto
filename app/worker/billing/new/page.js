import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../../nav';
import InvoiceBuilder from './InvoiceBuilder';

export const metadata = { title: 'New bill' };

export default async function NewInvoicePage({ searchParams }) {
  const { profile } = await requireRole(['worker', 'admin'], { from: '/worker/billing/new' });
  const supabase = createClient();

  const [{ data: services }, { data: bookings }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, base_price_cents')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('bookings')
      .select('id, reference, vehicles(make, model, registration), profiles!bookings_customer_id_fkey(full_name, phone)')
      .in('status', ['in_progress', 'awaiting_approval', 'awaiting_parts', 'completed'])
      .order('scheduled_for', { ascending: false })
      .limit(40),
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
      />
    </PortalShell>
  );
}
