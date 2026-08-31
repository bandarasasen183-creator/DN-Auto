import PortalShell from '@/components/PortalShell';
import PeopleTable from '@/components/PeopleTable';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_NAV } from '../nav';
import { formatLKR } from '@/lib/business';

export const metadata = { title: 'Workers' };

export default async function AdminWorkers() {
  const { profile } = await requireRole('admin', { from: '/admin/workers' });
  const supabase = createClient();

  const [{ data: staff }, { data: workerRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, is_active, created_at')
      .in('role', ['worker', 'admin'])
      .order('full_name'),
    supabase.from('workers').select('id, employee_code, hourly_rate_cents, specialities'),
  ]);

  const detailFor = Object.fromEntries((workerRows ?? []).map((w) => [w.id, w]));

  return (
    <PortalShell
      profile={profile}
      nav={ADMIN_NAV}
      current="/admin/workers"
      title="Workers & admins"
      subtitle="Staff accounts. Change a role here and their portal changes on their next page load."
    >
      <div className="rise">
        <PeopleTable people={staff ?? []} emptyMessage="No staff accounts yet." />
      </div>

      <section className="card rise rise-1" style={{ marginTop: '1.5rem' }}>
        <h3>Mechanic details</h3>
        {(workerRows ?? []).length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>
            No mechanic records yet — they are created when you set someone&apos;s role to Worker.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Mechanic</th><th>Code</th><th>Specialities</th><th className="right">Hourly rate</th></tr>
              </thead>
              <tbody>
                {(staff ?? [])
                  .filter((p) => detailFor[p.id])
                  .map((p) => (
                    <tr key={p.id}>
                      <td>{p.full_name}</td>
                      <td className="small muted">{detailFor[p.id].employee_code ?? '—'}</td>
                      <td className="small">{(detailFor[p.id].specialities ?? []).join(', ') || '—'}</td>
                      <td className="right">{formatLKR(detailFor[p.id].hourly_rate_cents)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  );
}
