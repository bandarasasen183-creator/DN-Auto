import Link from 'next/link';
import PortalShell from '@/components/PortalShell';
import StatusPill from '@/components/StatusPill';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../nav';

export const metadata = { title: 'My jobs' };

const OPEN = ['assigned', 'accepted', 'in_progress', 'awaiting_parts', 'awaiting_approval'];

export default async function JobsPage({ searchParams }) {
  const { profile } = await requireRole('worker', { from: '/worker/jobs' });
  const supabase = createClient();

  const done = searchParams?.show === 'done';

  const { data: jobs } = await supabase
    .from('bookings')
    .select(`
      id, reference, status, scheduled_for,
      services(name), vehicles(make, model, registration),
      profiles!bookings_customer_id_fkey(full_name)
    `)
    .eq('assigned_worker_id', profile.id)
    .in('status', done ? ['completed', 'cancelled', 'no_show'] : OPEN)
    .order('scheduled_for', { ascending: !done });

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/jobs"
      title="My jobs"
      subtitle="Everything assigned to you. Open a job to update its status."
    >
      <div className="tabs rise">
        <Link href="/worker/jobs" className="tab" data-active={!done}>Open</Link>
        <Link href="/worker/jobs?show=done" className="tab" data-active={done}>Finished</Link>
      </div>

      {(jobs ?? []).length === 0 ? (
        <div className="card center muted rise rise-1" style={{ marginTop: '1.5rem' }}>
          Nothing here.
        </div>
      ) : (
        <div className="grid rise rise-1" style={{ gap: '0.75rem', marginTop: '1.5rem' }}>
          {jobs.map((job) => (
            <Link key={job.id} href={`/worker/jobs/${job.id}`} className="card card--hover row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <strong>{job.services?.name ?? 'Service'}</strong>
                <p className="small muted" style={{ margin: 0 }}>
                  {job.reference} · {job.profiles?.full_name}
                  {job.vehicles ? ` · ${job.vehicles.registration}` : ''}
                </p>
              </div>
              <div className="row">
                <span className="small muted">
                  {new Date(job.scheduled_for).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <StatusPill status={job.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
