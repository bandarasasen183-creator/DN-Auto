import Link from 'next/link';
import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { STATUS_LABELS } from '@/lib/business';
import { TICKET_STATUS, OPEN_STATUSES, promiseState } from '@/lib/tickets';
import { WORKER_NAV } from './nav';
import Icon from '@/components/Icon';

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function WorkerHome() {
  const { profile } = await requireRole(['worker', 'admin'], { from: '/worker' });
  const supabase = createClient();

  const [{ data: incoming }, { data: tickets }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, reference, scheduled_for, services(name), vehicles(registration)')
      .in('status', ['confirmed', 'requested'])
      .order('scheduled_for', { ascending: true })
      .limit(8),
    supabase
      .from('tickets')
      .select('id, number, status, registration, complaint, promised_ready_at, assigned_name')
      .in('status', OPEN_STATUSES)
      .order('opened_at')
  ]);

  const activeTickets = tickets ?? [];
  const late = activeTickets.filter((t) => promiseState(t) === 'late').length;

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker"
      title="Dashboard"
      subtitle="Overview of the workshop and incoming jobs."
      actions={
        <Link href="/worker/tickets/new" className="btn">
          <Icon name="plus" size={16} /> New ticket
        </Link>
      }
    >
      <section className="grid rise rise-1" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="card">
          <p className="small muted" style={{ margin: 0 }}>Cars in workshop</p>
          <p style={{ fontSize: '2.4rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {activeTickets.length}
          </p>
          {late > 0 && (
            <p className="small form-error" style={{ margin: 0 }}>
              {late} past promised time
            </p>
          )}
        </div>
        <div className="card">
          <p className="small muted" style={{ margin: 0 }}>Incoming bookings</p>
          <p style={{ fontSize: '2.4rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {(incoming ?? []).length}
          </p>
        </div>
      </section>

      <div className="grid rise rise-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', marginTop: '2.5rem', gap: '1.5rem', alignItems: 'start' }}>
        <section className="card">
          <h3>In the workshop</h3>
          {activeTickets.length === 0 ? (
            <p className="muted small">Nothing in at the moment.</p>
          ) : (
            <div className="stack" style={{ '--gap': '0.75rem' }}>
              {activeTickets.map((t) => {
                const isLate = promiseState(t) === 'late';
                return (
                  <Link key={t.id} href={`/worker/tickets/${t.id}`} className="row" style={{ justifyContent: 'space-between', padding: '0.5rem', background: 'var(--surface-sunken)', borderRadius: '6px' }}>
                    <div>
                      <strong style={{ color: isLate ? 'var(--red)' : 'inherit' }}>{t.registration}</strong>
                      <p className="small muted" style={{ margin: 0 }}>
                        {t.complaint ? (t.complaint.length > 35 ? t.complaint.slice(0, 35) + '…' : t.complaint) : 'No specific complaint'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="pill pill--info">{TICKET_STATUS[t.status].label}</span>
                      {t.assigned_name && <p className="small muted" style={{ margin: '4px 0 0 0' }}>{t.assigned_name}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <div style={{ marginTop: '1rem' }}>
            <Link href="/worker/tickets" className="btn btn--ghost small">View board &rarr;</Link>
          </div>
        </section>

        <section className="card">
          <h3>Incoming jobs</h3>
          {(incoming ?? []).length === 0 ? (
            <p className="muted small">No upcoming bookings.</p>
          ) : (
            <div className="stack" style={{ '--gap': '0.75rem' }}>
              {incoming.map((job) => (
                <Link key={job.id} href={`/worker/incoming/${job.id}`} className="row" style={{ justifyContent: 'space-between', padding: '0.5rem', background: 'var(--surface-sunken)', borderRadius: '6px' }}>
                  <div>
                    <strong>{job.services?.name ?? 'Service'}</strong>
                    <p className="small muted" style={{ margin: 0 }}>
                      {job.vehicles?.registration ?? job.reference}
                    </p>
                  </div>
                  <span className="small muted">
                    {new Date(job.scheduled_for).toLocaleString('en-LK', {
                      weekday: 'short',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <div style={{ marginTop: '1rem' }}>
            <Link href="/worker/incoming" className="btn btn--ghost small">Manage incoming &rarr;</Link>
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
