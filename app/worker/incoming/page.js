import PortalShell from '@/components/PortalShell';
import StatusPill from '@/components/StatusPill';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../nav';
import AcceptJob from './AcceptJob';

export const metadata = { title: 'Incoming jobs' };

export default async function IncomingPage() {
  const { profile } = await requireRole('worker', { from: '/worker/incoming' });
  const supabase = createClient();

  const { data: jobs } = await supabase
    .from('bookings')
    .select(`
      id, reference, status, scheduled_for, is_emergency, customer_notes,
      services(name, duration_minutes),
      vehicles(make, model, year, registration),
      profiles!bookings_customer_id_fkey(full_name, phone)
    `)
    .is('assigned_worker_id', null)
    .in('status', ['requested', 'confirmed', 'assigned'])
    .order('scheduled_for', { ascending: true });

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/incoming"
      title="Incoming jobs"
      subtitle="Unclaimed work. Accept one and it moves to your jobs."
    >
      {(jobs ?? []).length === 0 ? (
        <div className="card center muted rise">Nothing waiting — the board is clear.</div>
      ) : (
        <div className="grid rise" style={{ gap: '1rem' }}>
          {jobs.map((job) => (
            <article key={job.id} className="card card--hover">
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <div className="row">
                    <strong>{job.services?.name ?? 'Service'}</strong>
                    {job.is_emergency && <span className="pill pill--bad">Emergency</span>}
                    <StatusPill status={job.status} />
                  </div>
                  <p className="small muted" style={{ margin: '0.25rem 0 0' }}>
                    {job.reference} · {job.profiles?.full_name}
                    {job.profiles?.phone ? ` · ${job.profiles.phone}` : ''}
                  </p>
                  {job.vehicles && (
                    <p className="small muted" style={{ margin: 0 }}>
                      {job.vehicles.make} {job.vehicles.model}
                      {job.vehicles.year ? ` (${job.vehicles.year})` : ''} · {job.vehicles.registration}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="small" style={{ margin: 0, fontWeight: 600 }}>
                    {new Date(job.scheduled_for).toLocaleString('en-LK', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  <p className="small muted" style={{ margin: 0 }}>
                    ~{job.services?.duration_minutes ?? 60} min
                  </p>
                </div>
              </div>

              {job.customer_notes && (
                <p className="small" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--steel-100)' }}>
                  <span className="muted">Customer says: </span>{job.customer_notes}
                </p>
              )}

              <AcceptJob bookingId={job.id} />
            </article>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
