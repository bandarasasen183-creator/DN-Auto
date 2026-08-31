import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { STATUS_LABELS, formatLKR } from '@/lib/business';

export const metadata = { title: 'Admin' };

export const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: '◆' },
  { href: '/admin/bookings', label: 'Bookings', icon: '▤' },
  { href: '/admin/customers', label: 'Customers', icon: '☺' },
  { href: '/admin/workers', label: 'Workers', icon: '⛏' },
  { href: '/admin/services', label: 'Services & prices', icon: '₨' },
  { href: '/admin/payments', label: 'Payments', icon: '▣' },
];

export default async function AdminHome() {
  const { profile } = await requireRole('admin', { from: '/admin' });
  const supabase = createClient();

  const [pending, todayJobs, revenue, recent] = await Promise.all([
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'requested'),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .gte('scheduled_for', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .lt('scheduled_for', new Date(new Date().setHours(23, 59, 59, 999)).toISOString()),
    supabase.from('payments').select('amount_cents').eq('status', 'paid'),
    supabase
      .from('bookings')
      .select('id, reference, status, scheduled_for, services(name), profiles!bookings_customer_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const paidTotal = (revenue.data ?? []).reduce((sum, p) => sum + Number(p.amount_cents), 0);

  const stats = [
    { label: 'Awaiting confirmation', value: pending.count ?? 0 },
    { label: 'Scheduled today', value: todayJobs.count ?? 0 },
    { label: 'Revenue collected', value: formatLKR(paidTotal) },
  ];

  return (
    <PortalShell
      profile={profile}
      nav={ADMIN_NAV}
      current="/admin"
      title="Workshop dashboard"
      subtitle="Bookings, staff and money — the whole workshop at a glance."
    >
      <section className="grid rise rise-1" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        {stats.map((s) => (
          <div key={s.label} className="card card--hover">
            <p className="small muted" style={{ margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              {s.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rise rise-2" style={{ marginTop: '2.5rem' }}>
        <h3>Latest bookings</h3>
        {(recent.data ?? []).length === 0 ? (
          <div className="card center muted">No bookings have come in yet.</div>
        ) : (
          <div className="grid" style={{ gap: '0.75rem' }}>
            {recent.data.map((b) => (
              <article key={b.id} className="card card--hover row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <strong>{b.profiles?.full_name ?? 'Customer'}</strong>
                  <p className="small muted" style={{ margin: 0 }}>
                    {b.reference} · {b.services?.name ?? 'Service'}
                  </p>
                </div>
                <div className="row">
                  <span className="small muted">
                    {new Date(b.scheduled_for).toLocaleString('en-LK', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                  <span className="pill">{STATUS_LABELS[b.status]}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PortalShell>
  );
}
