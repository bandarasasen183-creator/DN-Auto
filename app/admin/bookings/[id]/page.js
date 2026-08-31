import { notFound } from 'next/navigation';
import PortalShell from '@/components/PortalShell';
import StatusPill from '@/components/StatusPill';
import JobTimeline from '@/components/JobTimeline';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_NAV } from '../../nav';
import { STATUS_FLOW, STATUS_LABELS, formatLKR } from '@/lib/business';
import ManageBooking from './ManageBooking';
import QuoteBuilder from './QuoteBuilder';

export const metadata = { title: 'Booking' };

export default async function AdminBookingDetail({ params }) {
  const { profile } = await requireRole('admin', { from: `/admin/bookings/${params.id}` });
  const supabase = createClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, reference, status, scheduled_for, customer_notes, internal_notes,
      is_emergency, assigned_worker_id, bay_id,
      services(name), vehicles(make, model, year, registration),
      customer:profiles!bookings_customer_id_fkey(full_name, phone, email)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!booking) notFound();

  const [{ data: events }, { data: workers }, { data: bays }, { data: quotes }, { data: payments }] =
    await Promise.all([
      supabase
        .from('booking_events')
        .select('id, to_status, message, created_at')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'worker')
        .eq('is_active', true)
        .order('full_name'),
      supabase.from('bays').select('id, name').eq('is_active', true).order('name'),
      supabase
        .from('quotes')
        .select('id, status, total_cents, quote_items(id, description, quantity, unit_price_cents)')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('id, provider, status, amount_cents, provider_reference, paid_at')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false }),
    ]);

  return (
    <PortalShell
      profile={profile}
      nav={ADMIN_NAV}
      current="/admin/bookings"
      title={`${booking.reference} · ${booking.services?.name ?? 'Booking'}`}
      subtitle={new Date(booking.scheduled_for).toLocaleString('en-LK', { dateStyle: 'full', timeStyle: 'short' })}
      actions={<StatusPill status={booking.status} />}
    >
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', alignItems: 'start' }}>
        <div className="stack" style={{ '--gap': '1.5rem' }}>
          <ManageBooking
            booking={booking}
            workers={workers ?? []}
            bays={bays ?? []}
            statuses={Object.entries(STATUS_LABELS)}
          />

          <QuoteBuilder bookingId={booking.id} />

          {(quotes ?? []).length > 0 && (
            <section className="card rise">
              <h3>Quotes on this job</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Items</th><th>Status</th><th className="right">Total</th></tr></thead>
                  <tbody>
                    {quotes.map((q) => (
                      <tr key={q.id}>
                        <td className="small">
                          {q.quote_items.map((i) => i.description).join(', ')}
                        </td>
                        <td><span className="pill">{q.status}</span></td>
                        <td className="right"><strong>{formatLKR(q.total_cents)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="card rise rise-1">
            <h3>History</h3>
            <JobTimeline events={events ?? []} flow={STATUS_FLOW} current={booking.status} />
          </section>
        </div>

        <aside className="stack rise rise-2" style={{ '--gap': '1.5rem' }}>
          <section className="card">
            <h3>Customer</h3>
            <p style={{ margin: 0 }}>
              <strong>{booking.customer?.full_name}</strong><br />
              <span className="small muted">{booking.customer?.email}</span><br />
              {booking.customer?.phone && (
                <a className="small" href={`tel:${booking.customer.phone}`} style={{ color: 'var(--amber-600)' }}>
                  {booking.customer.phone}
                </a>
              )}
            </p>
          </section>

          <section className="card">
            <h3>Vehicle</h3>
            <p style={{ margin: 0 }}>
              {booking.vehicles
                ? `${booking.vehicles.make} ${booking.vehicles.model}${booking.vehicles.year ? ` (${booking.vehicles.year})` : ''} · ${booking.vehicles.registration}`
                : '—'}
            </p>
          </section>

          {booking.customer_notes && (
            <section className="card">
              <h3>Customer notes</h3>
              <p className="small" style={{ margin: 0 }}>{booking.customer_notes}</p>
            </section>
          )}

          <section className="card">
            <h3>Payments</h3>
            {(payments ?? []).length === 0 ? (
              <p className="muted small" style={{ margin: 0 }}>Nothing recorded yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} className="small">
                {payments.map((p) => (
                  <li key={p.id} className="row" style={{ justifyContent: 'space-between' }}>
                    <span>{p.provider.replace('_', ' ')}</span>
                    <strong>{formatLKR(p.amount_cents)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </PortalShell>
  );
}
