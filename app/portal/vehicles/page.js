import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { CUSTOMER_NAV } from '../nav';
import { removeVehicle } from '../actions';
import AddVehicle from './AddVehicle';

export const metadata = { title: 'My vehicles' };

export default async function VehiclesPage() {
  const { profile } = await requireRole('customer', { from: '/portal/vehicles' });
  const supabase = createClient();

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, make, model, year, registration, fuel')
    .order('created_at', { ascending: false });

  return (
    <PortalShell
      profile={profile}
      nav={CUSTOMER_NAV}
      current="/portal/vehicles"
      title="My vehicles"
      subtitle="Saved vehicles make booking a two-tap job next time."
    >
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', alignItems: 'start' }}>
        <div className="grid rise" style={{ gap: '0.75rem' }}>
          {(vehicles ?? []).length === 0 ? (
            <div className="card center muted">No vehicles saved yet.</div>
          ) : (
            vehicles.map((v) => (
              <article key={v.id} className="card card--hover row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{v.make} {v.model}</strong>
                  <p className="small muted" style={{ margin: 0 }}>
                    {v.year ? `${v.year} · ` : ''}{v.registration} · {v.fuel.replace('_', ' ')}
                  </p>
                </div>
                <form action={removeVehicle}>
                  <input type="hidden" name="vehicle_id" value={v.id} />
                  <button type="submit" className="btn btn--ghost small">Remove</button>
                </form>
              </article>
            ))
          )}
        </div>

        <AddVehicle />
      </div>
    </PortalShell>
  );
}
