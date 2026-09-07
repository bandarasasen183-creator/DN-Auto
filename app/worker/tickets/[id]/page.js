import Link from 'next/link';
import { notFound } from 'next/navigation';
import PortalShell from '@/components/PortalShell';
import Icon from '@/components/Icon';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../../nav';
import { TICKET_STATUS, elapsed, promiseState } from '@/lib/tickets';
import { fetchServiceHistory, isWarrantyLive } from '@/lib/service-history';
import { formatLKR } from '@/lib/business';
import { StatusActions, TicketDetails } from './TicketPanel';

export const metadata = { title: 'Ticket' };
export const dynamic = 'force-dynamic';

function stamp(value) {
  return new Date(value).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function TicketPage({ params }) {
  const { profile } = await requireRole(['worker', 'admin'], {
    from: `/worker/tickets/${params.id}`,
  });
  const supabase = createClient();

  const { data: ticket } = await supabase
    .from('tickets')
    .select(`
      id, number, status, registration, make, model, colour,
      customer_name, customer_phone, complaint, notes, keys_location,
      bay_id, assigned_name, promised_ready_at, opened_at, started_at,
      ready_at, collected_at, booking_id, invoice_id, contact_id,
      bays(name),
      opener:profiles!tickets_opened_by_fkey(full_name)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!ticket) notFound();

  const [{ data: bays }, { data: mechanics }, history] = await Promise.all([
    supabase.from('bays').select('id, name').eq('is_active', true).order('name'),
    supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['worker', 'admin'])
      .eq('is_active', true)
      .order('full_name'),
    // The point of keying everything on the plate: open a ticket and the
    // car's whole history is already here, without anybody going to look
    // for it.
    fetchServiceHistory(supabase, ticket.registration),
  ]);

  const previous = history.invoices.filter((i) => i.id !== ticket.invoice_id);
  const liveWarranties = history.warranties.filter(isWarrantyLive);
  const promise = promiseState(ticket);
  const status = TICKET_STATUS[ticket.status];

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/tickets"
      title={`${ticket.registration} · ${ticket.number}`}
      subtitle={`${[ticket.colour, ticket.make, ticket.model].filter(Boolean).join(' ') || 'Vehicle'} · here ${elapsed(ticket.opened_at)}`}
      actions={<span className={`pill ${status.pill}`}>{status.label}</span>}
    >
      <p>
        <Link href="/worker/tickets" className="btn btn--ghost small">
          <Icon name="chevronLeft" size={14} /> The board
        </Link>
      </p>

      {promise === 'late' && (
        <p className="form-error rise">
          This was promised for {stamp(ticket.promised_ready_at)}. If it&apos;s going
          to be longer, ring them — being told late is better than finding out
          on arrival.
        </p>
      )}

      {liveWarranties.length > 0 && (
        <div className="form-note rise">
          <strong>
            {liveWarranties.length} part{liveWarranties.length === 1 ? '' : 's'} on this
            car still under warranty.
          </strong>
          <ul className="small" style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
            {liveWarranties.map((w) => (
              <li key={w.id}>
                {w.description} — until{' '}
                {new Date(w.expires_on).toLocaleDateString('en-LK', { dateStyle: 'long' })}
                <span className="muted"> · {w.number}</span>
              </li>
            ))}
          </ul>
          <p className="small" style={{ margin: '0.5rem 0 0' }}>
            If the complaint is about one of these, the work is covered. Check
            before quoting.
          </p>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', alignItems: 'start' }}>
        <div className="stack" style={{ '--gap': '1.5rem' }}>
          <section className="card rise">
            <h3 style={{ marginTop: 0 }}>What they said</h3>
            <p style={{ fontSize: '1.05rem' }}>{ticket.complaint}</p>
            {ticket.notes && <p className="small muted">{ticket.notes}</p>}

            <dl className="receipt__meta small" style={{ borderTop: '1px dashed var(--steel-200)', marginTop: '1rem', paddingTop: '0.85rem' }}>
              <span><strong>Customer:</strong> {ticket.customer_name ?? 'Not given'}</span>
              {ticket.customer_phone && (
                <span>
                  <strong>Phone:</strong>{' '}
                  <a href={`tel:${ticket.customer_phone}`}>{ticket.customer_phone}</a>
                </span>
              )}
              {ticket.keys_location && <span><strong>Keys:</strong> {ticket.keys_location}</span>}
              {ticket.bays?.name && <span><strong>Bay:</strong> {ticket.bays.name}</span>}
            </dl>
          </section>

          <section className="card rise rise-1">
            <h3 style={{ marginTop: 0 }}>Today</h3>
            <ol className="timeline">
              <li>
                <strong>Arrived</strong>
                <span className="small muted">
                  {stamp(ticket.opened_at)}
                  {ticket.opener?.full_name ? ` · booked in by ${ticket.opener.full_name}` : ''}
                </span>
              </li>
              {ticket.started_at && (
                <li><strong>Work started</strong><span className="small muted">{stamp(ticket.started_at)}</span></li>
              )}
              {ticket.ready_at && (
                <li><strong>Ready</strong><span className="small muted">{stamp(ticket.ready_at)}</span></li>
              )}
              {ticket.collected_at && (
                <li><strong>Collected</strong><span className="small muted">{stamp(ticket.collected_at)}</span></li>
              )}
            </ol>
          </section>

          {previous.length > 0 && (
            <section className="card rise rise-2">
              <h3 style={{ marginTop: 0 }}>We&apos;ve seen this car before</h3>
              <ul className="small" style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.5rem' }}>
                {previous.slice(0, 6).map((invoice) => (
                  <li key={invoice.id}>
                    <Link href={`/worker/billing/${invoice.id}`}>
                      {new Date(invoice.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                    </Link>
                    {' — '}
                    {invoice.invoice_items.map((i) => i.description).join(', ') || 'no lines'}
                    <span className="muted"> · {formatLKR(invoice.total_cents)}</span>
                    {invoice.mechanic?.full_name && (
                      <span className="muted"> · {invoice.mechanic.full_name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="stack rise rise-1" style={{ '--gap': '1.5rem' }}>
          <section className="card">
            <h3 style={{ marginTop: 0 }}>Move it on</h3>
            <StatusActions ticket={ticket} />
          </section>

          {ticket.invoice_id ? (
            <section className="card">
              <h3 style={{ marginTop: 0 }}>Billed</h3>
              <Link href={`/worker/billing/${ticket.invoice_id}`} className="btn btn--ghost small">
                Open the bill <Icon name="arrowRight" size={14} />
              </Link>
            </section>
          ) : (
            ['ready', 'in_progress', 'collected'].includes(ticket.status) && (
              <section className="card">
                <h3 style={{ marginTop: 0 }}>Not billed yet</h3>
                <Link href={`/worker/billing/new?ticket=${ticket.id}`} className="btn">
                  <Icon name="receipt" size={15} /> Raise the bill
                </Link>
              </section>
            )
          )}

          <TicketDetails ticket={ticket} bays={bays ?? []} mechanics={mechanics ?? []} />
        </aside>
      </div>
    </PortalShell>
  );
}
