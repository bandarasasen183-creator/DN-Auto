import Link from 'next/link';
import PortalShell from '@/components/PortalShell';
import StatusPill from '@/components/StatusPill';
import Icon from '@/components/Icon';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_NAV } from '../nav';

export const metadata = { title: 'Schedule' };

/** Local YYYY-MM-DD; toISOString would shift the day in Sri Lanka's timezone. */
function dayKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export default async function SchedulePage({ searchParams }) {
  const { profile } = await requireRole('admin', { from: '/admin/schedule' });
  const supabase = createClient();

  const requested = searchParams?.date;
  const day = requested ? new Date(`${requested}T00:00`) : new Date();
  if (Number.isNaN(day.getTime())) day.setTime(Date.now());

  const start = new Date(day); start.setHours(0, 0, 0, 0);
  const end = new Date(day);   end.setHours(23, 59, 59, 999);

  const prev = new Date(start); prev.setDate(prev.getDate() - 1);
  const next = new Date(start); next.setDate(next.getDate() + 1);

  const [{ data: bookings }, { data: bays }] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, reference, status, scheduled_for, bay_id,
        services(name, duration_minutes),
        vehicles(make, model, registration),
        customer:profiles!bookings_customer_id_fkey(full_name, phone),
        worker:profiles!bookings_assigned_worker_id_fkey(full_name)
      `)
      .gte('scheduled_for', start.toISOString())
      .lte('scheduled_for', end.toISOString())
      .order('scheduled_for'),
    supabase.from('bays').select('id, name').eq('is_active', true).order('name'),
  ]);

  const rows = bookings ?? [];
  const unassigned = rows.filter((b) => !b.bay_id);

  return (
    <PortalShell
      profile={profile}
      nav={ADMIN_NAV}
      current="/admin/schedule"
      title="Schedule"
      subtitle={start.toLocaleDateString('en-LK', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })}
      actions={
        <div className="row">
          <Link href={`/admin/schedule?date=${dayKey(prev)}`} className="btn btn--ghost small" aria-label="Previous day">
            <Icon name="chevronLeft" size={16} />
          </Link>
          <Link href="/admin/schedule" className="btn btn--ghost small">Today</Link>
          <Link href={`/admin/schedule?date=${dayKey(next)}`} className="btn btn--ghost small" aria-label="Next day">
            <Icon name="chevronRight" size={16} />
          </Link>
        </div>
      }
    >
      <section className="grid cols-3 rise" style={{ marginBottom: '2rem' }}>
        <div className="stat">
          <span className="stat__label">Jobs today</span>
          <span className="stat__value">{rows.length}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Without a bay</span>
          <span className="stat__value">{unassigned.length}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Workshop time booked</span>
          <span className="stat__value">
            {Math.round(rows.reduce((m, b) => m + (b.services?.duration_minutes ?? 60), 0) / 60)}h
          </span>
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="empty rise">
          <Icon name="clock" size={30} />
          <h3>Nothing booked</h3>
          <p className="muted small">No jobs are scheduled for this day.</p>
        </div>
      ) : (
        <div className="bays rise">
          {[...(bays ?? []), { id: null, name: 'No bay assigned' }].map((bay) => {
            const inBay = rows.filter((b) => b.bay_id === bay.id);
            return (
              <section key={bay.id ?? 'none'} className="bay">
                <header className="bay__head">
                  <Icon name="bay" size={18} />
                  <strong>{bay.name}</strong>
                  <span className="small muted">{inBay.length} job{inBay.length === 1 ? '' : 's'}</span>
                </header>

                {inBay.length === 0 ? (
                  <p className="small muted" style={{ padding: '0.75rem' }}>Free all day.</p>
                ) : (
                  inBay.map((b) => (
                    <Link key={b.id} href={`/admin/bookings/${b.id}`} className="bay__job">
                      <span className="bay__time">
                        {new Date(b.scheduled_for).toLocaleTimeString('en-LK', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      <span className="bay__body">
                        <strong>{b.services?.name ?? 'Service'}</strong>
                        <span className="small muted">
                          {b.customer?.full_name}
                          {b.vehicles ? ` · ${b.vehicles.registration}` : ''}
                        </span>
                        <span className="small muted">
                          {b.worker?.full_name ?? 'No mechanic assigned'}
                        </span>
                      </span>
                      <StatusPill status={b.status} />
                    </Link>
                  ))
                )}
              </section>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
