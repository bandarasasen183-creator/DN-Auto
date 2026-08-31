import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../nav';
import { formatLKR } from '@/lib/business';

export const metadata = { title: 'My pay' };

export default async function PayPage() {
  const { profile } = await requireRole('worker', { from: '/worker/pay' });
  const supabase = createClient();

  const [{ data: payslips }, { data: worker }] = await Promise.all([
    supabase
      .from('payslips')
      .select(`
        id, jobs_completed, hours_worked, base_pay_cents, bonus_cents,
        deductions_cents, net_pay_cents, released_at,
        pay_periods(starts_on, ends_on, is_closed)
      `)
      .eq('worker_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('workers')
      .select('employee_code, hourly_rate_cents, specialities, hired_on')
      .eq('id', profile.id)
      .maybeSingle(),
  ]);

  const released = (payslips ?? []).filter((p) => p.released_at);
  const ytd = released.reduce((sum, p) => sum + Number(p.net_pay_cents), 0);

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/pay"
      title="My pay"
      subtitle="Your pay periods and payslips, straight from the workshop's records."
    >
      <section className="grid rise" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card card--hover">
          <p className="small muted" style={{ margin: 0 }}>Paid to date</p>
          <p style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {formatLKR(ytd)}
          </p>
        </div>
        <div className="card card--hover">
          <p className="small muted" style={{ margin: 0 }}>Hourly rate</p>
          <p style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {worker ? formatLKR(worker.hourly_rate_cents) : '—'}
          </p>
        </div>
        <div className="card card--hover">
          <p className="small muted" style={{ margin: 0 }}>Payslips</p>
          <p style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {(payslips ?? []).length}
          </p>
        </div>
      </section>

      <section className="card rise rise-1" style={{ marginTop: '2rem' }}>
        <h3>Payslips</h3>
        {(payslips ?? []).length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>
            No payslips yet. They appear here as soon as admin closes a pay period.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Jobs</th>
                  <th>Hours</th>
                  <th className="right">Base</th>
                  <th className="right">Bonus</th>
                  <th className="right">Deductions</th>
                  <th className="right">Net</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((p) => (
                  <tr key={p.id}>
                    <td>{p.pay_periods?.starts_on} → {p.pay_periods?.ends_on}</td>
                    <td>{p.jobs_completed}</td>
                    <td>{p.hours_worked}</td>
                    <td className="right">{formatLKR(p.base_pay_cents)}</td>
                    <td className="right">{formatLKR(p.bonus_cents)}</td>
                    <td className="right">{formatLKR(p.deductions_cents)}</td>
                    <td className="right"><strong>{formatLKR(p.net_pay_cents)}</strong></td>
                    <td>
                      <span className={`pill ${p.released_at ? 'pill--ok' : 'pill--warn'}`}>
                        {p.released_at ? 'Paid' : 'Pending'}
                      </span>
                    </td>
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
