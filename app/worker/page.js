import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { STATUS_LABELS, formatLKR } from '@/lib/business';

import { WORKER_NAV } from './nav';

export const metadata = { title: 'Workshop' };


export default async function WorkerHome() {
  const { profile } = await requireRole('worker', { from: '/worker' });
  const supabase = createClient();

  const [{ data: mine }, { data: incoming }, { data: payslip }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, reference, status, scheduled_for, services(name), profiles!bookings_customer_id_fkey(full_name)')
      .eq('assigned_worker_id', profile.id)
      .not('status', 'in', '("completed","cancelled","no_show")')
      .order('scheduled_for', { ascending: true }),
    supabase
      .from('bookings')
      .select('id, reference, scheduled_for, services(name)')
      .is('assigned_worker_id', null)
      .in('status', ['confirmed', 'requested'])
      .order('scheduled_for', { ascending: true })
      .limit(5),
    supabase
      .from('payslips')
      .select('net_pay_cents, jobs_completed, pay_periods(starts_on, ends_on)')
      .eq('worker_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker"
      title={`Good day, ${profile.full_name.split(' ')[0]}`}
      subtitle="Your assigned jobs, what's waiting to be claimed, and your latest pay."
    >
      <section className="grid rise rise-1" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card card--hover">
          <p className="small muted" style={{ margin: 0 }}>Open jobs</p>
          <p style={{ fontSize: '2.4rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {(mine ?? []).length}
          </p>
        </div>
        <div className="card card--hover">
          <p className="small muted" style={{ margin: 0 }}>Waiting to be claimed</p>
          <p style={{ fontSize: '2.4rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {(incoming ?? []).length}
          </p>
        </div>
        <div className="card card--hover">
          <p className="small muted" style={{ margin: 0 }}>Latest payslip</p>
          <p style={{ fontSize: '2.4rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {payslip ? formatLKR(payslip.net_pay_cents) : '—'}
          </p>
          {payslip?.pay_periods && (
            <p className="small muted" style={{ margin: 0 }}>
              {payslip.pay_periods.starts_on} → {payslip.pay_periods.ends_on}
            </p>
          )}
        </div>
      </section>

      <section className="rise rise-2" style={{ marginTop: '2.5rem' }}>
        <h3>Your jobs</h3>
        {(mine ?? []).length === 0 ? (
          <div className="card center muted">Nothing assigned to you right now.</div>
        ) : (
          <div className="grid" style={{ gap: '0.75rem' }}>
            {mine.map((job) => (
              <article key={job.id} className="card card--hover row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <strong>{job.services?.name ?? 'Service'}</strong>
                  <p className="small muted" style={{ margin: 0 }}>
                    {job.reference} · {job.profiles?.full_name}
                  </p>
                </div>
                <div className="row">
                  <span className="small muted">
                    {new Date(job.scheduled_for).toLocaleString('en-LK', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                  <span className="pill pill--info">{STATUS_LABELS[job.status]}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PortalShell>
  );
}
