import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { CUSTOMER_NAV } from '../nav';
import BookingWizard from './BookingWizard';

export const metadata = { title: 'Book a service' };

export default async function BookPage() {
  const { profile } = await requireRole('customer', { from: '/portal/book' });
  const supabase = createClient();

  const [{ data: services }, { data: vehicles }, { count }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, description, base_price_cents, price_is_from')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('vehicles')
      .select('id, make, model, year, registration')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', profile.id),
  ]);

  return (
    <PortalShell
      profile={profile}
      nav={CUSTOMER_NAV}
      current="/portal/book"
      title="Book a service"
      subtitle="Five short steps. You can go back and change anything before you confirm."
    >
      <BookingWizard
        services={services ?? []}
        vehicles={vehicles ?? []}
        isExistingCustomer={(count ?? 0) > 0}
      />
    </PortalShell>
  );
}
