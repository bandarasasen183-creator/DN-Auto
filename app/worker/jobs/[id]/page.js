import { notFound } from 'next/navigation';
import PortalShell from '@/components/PortalShell';
import StatusPill from '@/components/StatusPill';
import JobTimeline from '@/components/JobTimeline';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../../nav';
import { STATUS_FLOW } from '@/lib/business';
import UpdateStatus from './UpdateStatus';

export const metadata = { title: 'Job' };

export default async function JobDetail({ params }) {
  const { profile } = await requireRole('worker', { from: `/worker/jobs/${params.id}` });
  const supabase = createClient();

  const { data: job } = await supabase
    .from('bookings')
    .select(`
      id, reference, status, scheduled_for, customer_notes, internal_notes,
      is_emergency, assigned_worker_id,
      services(name, description, duration_minutes),
      vehicles(make, model, year, registration),
      profiles!bookings_customer_id_fkey(full_name, phone, email)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!job) notFound();

  const { data: events } = await supabase
    .from('booking_events')
    .select('id, to_status, message, created_at')
    .eq('booking_id', job.id)
    .order('created_at', { ascending: true });

  const isMine = job.assigned_worker_id === profile.id;

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/jobs"
      title={job.services?.name ?? 'Job'}
      subtitle={`${job.reference} · ${new Date(job.scheduled_for).toLocaleString('en-LK', { dateStyle: 'full', timeStyle: 'short' })}`}
      actions={<StatusPill status={job.status} />}
    >
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', alignItems: 'start' }}>
        <div className="stack" style={{ '--gap': '1.5rem' }}>
          {isMine ? (
            <UpdateStatus bookingId={job.id} currentStatus={job.status} />
          ) : (
            <div className="card muted small">
              This job is assigned to another mechanic — you can read it, but not change it.
            </div>
          )}

          <section className="card rise">
            <h3>Job history</h3>
            <JobTimeline events={events ?? []} flow={STATUS_FLOW} current={job.status} />
          </section>
        </div>

        <aside className="stack rise rise-1" style={{ '--gap': '1.5rem' }}>
          <section className="card">
            <h3>Customer</h3>
            <p style={{ margin: 0 }}>
              <strong>{job.profiles?.full_name}</strong><br />
              {job.profiles?.phone && (
                <a className="small" href={`tel:${job.profiles.phone}`} style={{ color: 'var(--amber-600)' }}>
                  {job.profiles.phone}
                </a>
              )}
            </p>
          </section>

          <section className="card">
            <h3>Vehicle</h3>
            {job.vehicles ? (
              <p style={{ margin: 0 }}>
                <strong>{job.vehicles.make} {job.vehicles.model}</strong><br />
                <span className="small muted">
                  {job.vehicles.year ? `${job.vehicles.year} · ` : ''}{job.vehicles.registration}
                </span>
              </p>
            ) : (
              <p className="muted small" style={{ margin: 0 }}>Not recorded.</p>
            )}
          </section>

          {job.customer_notes && (
            <section className="card">
              <h3>Customer notes</h3>
              <p className="small" style={{ margin: 0 }}>{job.customer_notes}</p>
            </section>
          )}

          {job.internal_notes && (
            <section className="card">
              <h3>Workshop notes</h3>
              <p className="small" style={{ margin: 0 }}>{job.internal_notes}</p>
            </section>
          )}
        </aside>
      </div>
    </PortalShell>
  );
}
