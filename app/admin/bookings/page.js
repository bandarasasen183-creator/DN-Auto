import Link from 'next/link';
import PortalShell from '@/components/PortalShell';
import StatusPill from '@/components/StatusPill';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_NAV } from '../nav';
import { STATUS_LABELS } from '@/lib/business';

export const metadata = { title: 'Bookings' };

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'requested', label: 'New' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
];

export default async function AdminBookings({ searchParams }) {
  const { profile } = await requireRole('admin', { from: '/admin/bookings' });
  const supabase = createClient();

  const filter = FILTERS.some((f) => f.key === searchParams?.status)
    ? searchParams.status
    : 'all';

  let query = supabase
    .from('bookings')
    .select(`
      id, reference, status, scheduled_for, is_emergency,
      services(name),
      vehicles(make, model, registration),
      customer:profiles!bookings_customer_id_fkey(full_name, phone),
      worker:profiles!bookings_assigned_worker_id_fkey(full_name)
    `)
    .order('scheduled_for', { ascending: false })
    .limit(100);

  if (filter !== 'all') query = query.eq('status', filter);

  const { data: bookings } = await query;

  return (
    <PortalShell
      profile={profile}
      nav={ADMIN_NAV}
      current="/admin/bookings"
      title="Bookings"
      subtitle="Every job in the diary. Open one to assign a mechanic or build a quote."
    >
      <div className="tabs rise">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/admin/bookings' : `/admin/bookings?status=${f.key}`}
            className="tab"
            data-active={filter === f.key}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="card rise rise-1 table-wrap" style={{ marginTop: '1.5rem' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Vehicle</th>
              <th>When</th>
              <th>Mechanic</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(bookings ?? []).length === 0 ? (
              <tr><td colSpan={7} className="muted center">No bookings match this filter.</td></tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/admin/bookings/${b.id}`} style={{ fontWeight: 600, color: 'var(--amber-600)' }}>
                      {b.reference}
                    </Link>
                    {b.is_emergency && <span className="pill pill--bad" style={{ marginLeft: '0.4rem' }}>Emg</span>}
                  </td>
                  <td>{b.customer?.full_name}<br /><span className="small muted">{b.customer?.phone}</span></td>
                  <td>{b.services?.name}</td>
                  <td className="small">{b.vehicles ? `${b.vehicles.make} ${b.vehicles.model} · ${b.vehicles.registration}` : '—'}</td>
                  <td className="small">
                    {new Date(b.scheduled_for).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="small">{b.worker?.full_name ?? <span className="muted">Unassigned</span>}</td>
                  <td><StatusPill status={b.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="small muted" style={{ marginTop: '1rem' }}>
        Statuses: {Object.values(STATUS_LABELS).join(' · ')}
      </p>
    </PortalShell>
  );
}
