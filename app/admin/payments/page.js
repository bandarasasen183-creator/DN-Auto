import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_NAV } from '../nav';
import { formatLKR } from '@/lib/business';
import RecordPayment from './RecordPayment';

export const metadata = { title: 'Payments' };

export default async function AdminPayments() {
  const { profile } = await requireRole('admin', { from: '/admin/payments' });
  const supabase = createClient();

  const [{ data: payments }, { data: openBookings }] = await Promise.all([
    supabase
      .from('payments')
      .select('id, provider, status, amount_cents, provider_reference, paid_at, created_at, bookings(reference)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('bookings')
      .select('id, reference, profiles!bookings_customer_id_fkey(full_name)')
      .in('status', ['in_progress', 'awaiting_approval', 'awaiting_parts', 'completed'])
      .order('scheduled_for', { ascending: false })
      .limit(50),
  ]);

  const rows = payments ?? [];
  const collected = rows
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount_cents), 0);

  // Grouping by provider is what tells you whether the POS terminal is worth
  // its monthly fee once real gateways are plugged in.
  const byProvider = rows
    .filter((p) => p.status === 'paid')
    .reduce((acc, p) => {
      acc[p.provider] = (acc[p.provider] ?? 0) + Number(p.amount_cents);
      return acc;
    }, {});

  return (
    <PortalShell
      profile={profile}
      nav={ADMIN_NAV}
      current="/admin/payments"
      title="Payments"
      subtitle="Cash today, WEBXPAY / Koko / Payable when the merchant accounts are live — same ledger either way."
    >
      <section className="grid rise" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card card--hover">
          <p className="small muted" style={{ margin: 0 }}>Collected</p>
          <p style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {formatLKR(collected)}
          </p>
        </div>
        {Object.entries(byProvider).map(([provider, amount]) => (
          <div key={provider} className="card card--hover">
            <p className="small muted" style={{ margin: 0, textTransform: 'capitalize' }}>
              {provider.replace('_', ' ')}
            </p>
            <p style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              {formatLKR(amount)}
            </p>
          </div>
        ))}
      </section>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', alignItems: 'start', marginTop: '2rem' }}>
        <section className="card rise rise-1 table-wrap">
          <h3>Ledger</h3>
          {rows.length === 0 ? (
            <p className="muted small" style={{ margin: 0 }}>No payments recorded yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Booking</th><th>Provider</th><th>Reference</th><th>Date</th><th className="right">Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.bookings?.reference}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.provider.replace('_', ' ')}</td>
                    <td className="small muted">{p.provider_reference ?? '—'}</td>
                    <td className="small">
                      {new Date(p.paid_at ?? p.created_at).toLocaleDateString('en-LK')}
                    </td>
                    <td className="right"><strong>{formatLKR(p.amount_cents)}</strong></td>
                    <td>
                      <span className={`pill ${p.status === 'paid' ? 'pill--ok' : p.status === 'failed' ? 'pill--bad' : 'pill--warn'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <RecordPayment bookings={openBookings ?? []} />
      </div>
    </PortalShell>
  );
}
