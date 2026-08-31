import Link from 'next/link';
import PortalShell from '@/components/PortalShell';
import StatusPill from '@/components/StatusPill';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { CUSTOMER_NAV } from '../nav';

export const metadata = { title: 'My bookings' };

const OPEN_STATUSES = ['requested', 'confirmed', 'assigned', 'accepted', 'in_progress', 'awaiting_parts', 'awaiting_approval'];

export default async function BookingsPage({ searchParams }) {
  const { profile } = await requireRole('customer', { from: '/portal/bookings' });
  const supabase = createClient();

  const filter = searchParams?.show === 'past' ? 'past' : 'open';

  let query = supabase
    .from('bookings')
    .select('id, reference, status, scheduled_for, services(name), vehicles(make, model, registration)')
    .order('scheduled_for', { ascending: filter === 'open' });

  query =
    filter === 'open'
      ? query.in('status', OPEN_STATUSES)
      : query.in('status', ['completed', 'cancelled', 'no_show']);

  const { data: bookings } = await query;

  return (
    <PortalShell
      profile={profile}
      nav={CUSTOMER_NAV}
      current="/portal/bookings"
      title="My bookings"
      subtitle="Every job we've done for you, and everything still in progress."
      actions={<Link href="/portal/book" className="btn">Book a service</Link>}
    >
      <div className="tabs rise">
        <Link href="/portal/bookings" className="tab" data-active={filter === 'open'}>
          In progress
        </Link>
        <Link href="/portal/bookings?show=past" className="tab" data-active={filter === 'past'}>
          History
        </Link>
      </div>

      {(bookings ?? []).length === 0 ? (
        <div className="card center muted rise rise-1" style={{ marginTop: '1.5rem' }}>
          Nothing here yet.
        </div>
      ) : (
        <div className="grid rise rise-1" style={{ gap: '0.75rem', marginTop: '1.5rem' }}>
          {bookings.map((b) => (
            <Link key={b.id} href={`/portal/bookings/${b.id}`} className="card card--hover row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <strong>{b.services?.name ?? 'Service'}</strong>
                <p className="small muted" style={{ margin: 0 }}>
                  {b.reference}
                  {b.vehicles ? ` · ${b.vehicles.make} ${b.vehicles.model} (${b.vehicles.registration})` : ''}
                </p>
              </div>
              <div className="row">
                <span className="small muted">
                  {new Date(b.scheduled_for).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <StatusPill status={b.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
