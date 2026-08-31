import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_NAV } from '../nav';
import { EXCLUSIONS } from '@/lib/business';
import ServiceEditor from './ServiceEditor';

export const metadata = { title: 'Services & prices' };

export default async function AdminServices() {
  const { profile } = await requireRole('admin', { from: '/admin/services' });
  const supabase = createClient();

  const { data: services } = await supabase
    .from('services')
    .select('id, name, description, category, base_price_cents, price_is_from, duration_minutes, is_active')
    .order('sort_order');

  return (
    <PortalShell
      profile={profile}
      nav={ADMIN_NAV}
      current="/admin/services"
      title="Services & prices"
      subtitle="Guide prices in LKR. These are what customers see on the site and in the booking wizard."
    >
      <div className="card rise" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--bad)' }}>
        <h3 style={{ margin: 0 }}>Out of scope — don&apos;t add these</h3>
        <p className="small muted" style={{ margin: '0.4rem 0 0' }}>
          {EXCLUSIONS.join(' · ')}. The booking wizard also refuses requests mentioning them.
        </p>
      </div>

      <div className="grid rise rise-1" style={{ gap: '1rem' }}>
        {(services ?? []).map((s) => (
          <ServiceEditor key={s.id} service={s} />
        ))}
        <ServiceEditor />
      </div>
    </PortalShell>
  );
}
