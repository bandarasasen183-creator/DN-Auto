import Link from 'next/link';
import PortalShell from '@/components/PortalShell';
import Icon from '@/components/Icon';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../nav';
import { TICKET_STATUS, OPEN_STATUSES, elapsed, promiseState, startOfToday } from '@/lib/tickets';

export const metadata = { title: 'In the workshop' };

// Live board — a mechanic looking at this wants what is true now, not
// what was true when the page was cached.
export const dynamic = 'force-dynamic';

const COLUMNS = ['waiting', 'in_progress', 'ready'];

function Card({ ticket }) {
  const promise = promiseState(ticket);

  return (
    <li className={`tkt ${promise ? `tkt--${promise}` : ''}`}>
      <Link href={`/worker/tickets/${ticket.id}`}>
        <div className="tkt__head">
          <span className="plate plate--sm">{ticket.registration}</span>
          <span className="small muted">{ticket.number}</span>
        </div>

        <p className="tkt__complaint">{ticket.complaint}</p>

        <div className="tkt__meta small">
          <span>
            <Icon name="clock" size={12} /> {elapsed(ticket.opened_at)}
          </span>
          {ticket.assigned_name && (
            <span><Icon name="users" size={12} /> {ticket.assigned_name}</span>
          )}
          {ticket.bays?.name && (
            <span><Icon name="bay" size={12} /> {ticket.bays.name}</span>
          )}
        </div>

        {promise === 'late' && (
          <p className="tkt__flag small">
            Promised {new Date(ticket.promised_ready_at).toLocaleTimeString('en-LK', { timeStyle: 'short' })}
          </p>
        )}
        {promise === 'soon' && (
          <p className="tkt__flag tkt__flag--soon small">
            Due {new Date(ticket.promised_ready_at).toLocaleTimeString('en-LK', { timeStyle: 'short' })}
          </p>
        )}
      </Link>
    </li>
  );
}

export default async function TicketsPage() {
  const { profile } = await requireRole(['worker', 'admin'], { from: '/worker/tickets' });
  const supabase = createClient();

  const [{ data: open }, { data: collectedToday }] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, number, status, registration, complaint, opened_at, promised_ready_at, assigned_name, bays(name)')
      .in('status', OPEN_STATUSES)
      .order('opened_at'),
    supabase
      .from('tickets')
      .select('id, number, registration, complaint, collected_at')
      .eq('status', 'collected')
      .gte('collected_at', startOfToday().toISOString())
      .order('collected_at', { ascending: false }),
  ]);

  const tickets = open ?? [];
  const byStatus = Object.fromEntries(
    COLUMNS.map((key) => [key, tickets.filter((t) => t.status === key)])
  );

  const late = tickets.filter((t) => promiseState(t) === 'late').length;

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/tickets"
      title="In the workshop"
      subtitle={
        tickets.length === 0
          ? 'Nothing in at the moment.'
          : `${tickets.length} car${tickets.length === 1 ? '' : 's'} here${late > 0 ? ` · ${late} past a promised time` : ''}`
      }
      actions={
        <Link href="/worker/tickets/new" className="btn">
          <Icon name="plus" size={15} /> Car arrived
        </Link>
      }
    >
      <div className="board">
        {COLUMNS.map((key) => (
          <section key={key} className="board__col">
            <h3>
              {TICKET_STATUS[key].label}
              <span className="board__count">{byStatus[key].length}</span>
            </h3>

            {byStatus[key].length === 0 ? (
              <p className="muted small board__empty">Nothing here.</p>
            ) : (
              <ul className="board__list">
                {byStatus[key].map((ticket) => (
                  <Card key={ticket.id} ticket={ticket} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {(collectedToday ?? []).length > 0 && (
        <section className="card rise" style={{ marginTop: '1.5rem' }}>
          <h3>Collected today</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {collectedToday.map((t) => (
              <li key={t.id}>
                <Link href={`/worker/tickets/${t.id}`}>{t.registration}</Link>
                <span className="muted">
                  {' '}— {t.complaint} ·{' '}
                  {new Date(t.collected_at).toLocaleTimeString('en-LK', { timeStyle: 'short' })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PortalShell>
  );
}
