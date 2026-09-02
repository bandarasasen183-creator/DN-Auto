import Link from 'next/link';
import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { STATUS_LABELS, STATUS_FLOW, formatLKR } from '@/lib/business';

import { CUSTOMER_NAV } from './nav';
import ReferralCard from '@/components/ReferralCard';

export const metadata = { title: 'Your portal' };


function statusTone(status) {
  if (status === 'completed') return 'pill--ok';
  if (status === 'cancelled' || status === 'no_show') return 'pill--bad';
  if (status === 'awaiting_approval' || status === 'awaiting_parts') return 'pill--warn';
  return 'pill--info';
}

export default async function CustomerHome() {
  const { profile } = await requireRole('customer', { from: '/portal' });
  const supabase = createClient();

  const [{ data: bookings }, { data: quotes }, { data: me }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, reference, status, scheduled_for, services(name), vehicles(make, model, registration)')
      .order('scheduled_for', { ascending: false })
      .limit(5),
    supabase
      .from('quotes')
      .select('id, status, total_cents, bookings(reference)')
      .eq('status', 'sent')
      .limit(5),
    supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', profile.id)
      .maybeSingle(),
  ]);

  const rows = bookings ?? [];
  const active = rows.filter(
    (b) => !['completed', 'cancelled', 'no_show'].includes(b.status)
  );

  return (
    <PortalShell
      profile={profile}
      nav={CUSTOMER_NAV}
      current="/portal"
      title={`Welcome back, ${profile.full_name.split(' ')[0]}`}
      subtitle="Everything about your vehicles and repairs, in one place."
      actions={
        <Link href="/portal/book" className="btn">
          Book a service
        </Link>
      }
    >
      <section className="grid rise rise-1" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card card--hover">
          <p className="small muted" style={{ margin: 0 }}>Active jobs</p>
          <p style={{ fontSize: '2.4rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {active.length}
          </p>
        </div>
        <div className="card card--hover">
          <p className="small muted" style={{ margin: 0 }}>Quotes awaiting you</p>
          <p style={{ fontSize: '2.4rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {(quotes ?? []).length}
          </p>
        </div>
        <div className="card card--hover">
          <p className="small muted" style={{ margin: 0 }}>Total bookings</p>
          <p style={{ fontSize: '2.4rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {rows.length}
          </p>
        </div>
      </section>

      {me?.referral_code && (
        <div className="rise rise-2" style={{ marginTop: '2rem' }}>
          <ReferralCard code={me.referral_code} />
        </div>
      )}

      <section className="rise rise-3" style={{ marginTop: '2.5rem' }}>
        <h3>Recent bookings</h3>
        {rows.length === 0 ? (
          <div className="card center">
            <p className="muted">You have no bookings yet.</p>
            <Link href="/portal/book" className="btn">Book your first service</Link>
          </div>
        ) : (
          <div className="grid" style={{ gap: '0.75rem' }}>
            {rows.map((b) => (
              <article key={b.id} className="card card--hover">
                <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div>
                    <strong>{b.services?.name ?? 'Service'}</strong>
                    <p className="small muted" style={{ margin: 0 }}>
                      {b.reference}
                      {b.vehicles ? ` · ${b.vehicles.make} ${b.vehicles.model} (${b.vehicles.registration})` : ''}
                    </p>
                  </div>
                  <span className={`pill ${statusTone(b.status)}`}>
                    {STATUS_LABELS[b.status]}
                  </span>
                </div>
                <p className="small muted" style={{ marginBottom: 0 }}>
                  {new Date(b.scheduled_for).toLocaleString('en-LK', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                  {STATUS_FLOW.includes(b.status)
                    ? ` · step ${STATUS_FLOW.indexOf(b.status) + 1} of ${STATUS_FLOW.length}`
                    : ''}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {(quotes ?? []).length > 0 && (
        <section className="rise rise-4" style={{ marginTop: '2.5rem' }}>
          <h3>Quotes waiting for your approval</h3>
          <div className="grid" style={{ gap: '0.75rem' }}>
            {quotes.map((q) => (
              <article key={q.id} className="card card--hover row" style={{ justifyContent: 'space-between' }}>
                <span>{q.bookings?.reference}</span>
                <strong>{formatLKR(q.total_cents)}</strong>
              </article>
            ))}
          </div>
        </section>
      )}
    </PortalShell>
  );
}
