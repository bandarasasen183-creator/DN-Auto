import Link from 'next/link';
import { notFound } from 'next/navigation';
import PortalShell from '@/components/PortalShell';
import StatusPill from '@/components/StatusPill';
import JobTimeline from '@/components/JobTimeline';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { CUSTOMER_NAV } from '../../nav';
import { formatLKR, STATUS_FLOW } from '@/lib/business';
import CancelBooking from './CancelBooking';

export const metadata = { title: 'Booking' };

export default async function BookingDetail({ params }) {
  const { profile } = await requireRole('customer', { from: `/portal/bookings/${params.id}` });
  const supabase = createClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, reference, status, scheduled_for, customer_notes, is_emergency,
      completed_at, cancellation_reason,
      services(name, description),
      vehicles(make, model, year, registration),
      profiles!bookings_assigned_worker_id_fkey(full_name)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!booking) notFound();

  const [{ data: events }, { data: quotes }] = await Promise.all([
    supabase
      .from('booking_events')
      .select('id, to_status, message, created_at')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('quotes')
      .select('id, status, total_cents, notes, quote_items(id, description, kind, quantity, unit_price_cents, warranty_months)')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false }),
  ]);

  const canCancel = ['requested', 'confirmed'].includes(booking.status);

  return (
    <PortalShell
      profile={profile}
      nav={CUSTOMER_NAV}
      current="/portal/bookings"
      title={booking.services?.name ?? 'Booking'}
      subtitle={`${booking.reference} · ${new Date(booking.scheduled_for).toLocaleString('en-LK', { dateStyle: 'full', timeStyle: 'short' })}`}
      actions={<StatusPill status={booking.status} />}
    >
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', alignItems: 'start' }}>
        <div className="stack" style={{ '--gap': '1.5rem' }}>
          <section className="card rise">
            <h3>Repair log</h3>
            <p className="small muted">
              Every update from the workshop, in order. This is written automatically as your
              job moves — nobody types it in after the fact.
            </p>
            <JobTimeline events={events ?? []} flow={STATUS_FLOW} current={booking.status} />
          </section>

          {(quotes ?? []).map((q) => (
            <section key={q.id} className="card rise rise-1">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>Quote</h3>
                <span className={`pill ${q.status === 'approved' ? 'pill--ok' : q.status === 'rejected' ? 'pill--bad' : 'pill--warn'}`}>
                  {q.status}
                </span>
              </div>
              <table className="table">
                <thead>
                  <tr><th>Item</th><th>Qty</th><th className="right">Price</th></tr>
                </thead>
                <tbody>
                  {q.quote_items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.description}
                        {item.warranty_months > 0 && (
                          <span className="pill pill--ok small" style={{ marginLeft: '0.5rem' }}>
                            {item.warranty_months}-month warranty
                          </span>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td className="right">{formatLKR(item.unit_price_cents * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><th colSpan={2}>Total</th><th className="right">{formatLKR(q.total_cents)}</th></tr>
                </tfoot>
              </table>
              {q.status === 'sent' && (
                <p className="small">
                  <Link href="/portal/quotes" style={{ color: 'var(--amber-600)', fontWeight: 600 }}>
                    Approve or decline this quote →
                  </Link>
                </p>
              )}
            </section>
          ))}
        </div>

        <aside className="stack rise rise-2" style={{ '--gap': '1.5rem' }}>
          <section className="card">
            <h3>Vehicle</h3>
            {booking.vehicles ? (
              <p style={{ margin: 0 }}>
                <strong>{booking.vehicles.make} {booking.vehicles.model}</strong>
                <br />
                <span className="small muted">
                  {booking.vehicles.year ? `${booking.vehicles.year} · ` : ''}
                  {booking.vehicles.registration}
                </span>
              </p>
            ) : (
              <p className="muted small">No vehicle recorded.</p>
            )}
          </section>

          <section className="card">
            <h3>Your mechanic</h3>
            <p style={{ margin: 0 }}>
              {booking.profiles?.full_name ?? <span className="muted small">Not assigned yet</span>}
            </p>
          </section>

          {booking.customer_notes && (
            <section className="card">
              <h3>What you told us</h3>
              <p className="small" style={{ margin: 0 }}>{booking.customer_notes}</p>
            </section>
          )}

          {booking.cancellation_reason && (
            <section className="card">
              <h3>Cancelled</h3>
              <p className="small" style={{ margin: 0 }}>{booking.cancellation_reason}</p>
            </section>
          )}

          {canCancel && <CancelBooking bookingId={booking.id} />}
        </aside>
      </div>
    </PortalShell>
  );
}
