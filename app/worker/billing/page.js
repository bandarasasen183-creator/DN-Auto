import Link from 'next/link';
import PortalShell from '@/components/PortalShell';
import Icon from '@/components/Icon';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../nav';
import { formatLKR } from '@/lib/business';

export const metadata = { title: 'Billing' };

const STATUS_TONE = {
  paid: 'pill--ok',
  issued: 'pill--warn',
  draft: '',
  void: 'pill--bad',
  refunded: 'pill--bad',
  part_refunded: 'pill--warn',
};

export default async function BillingPage({ searchParams }) {
  const { profile } = await requireRole(['worker', 'admin'], { from: '/worker/billing' });
  const supabase = createClient();

  const mine = searchParams?.show === 'mine';

  let query = supabase
    .from('invoices')
    .select('id, number, status, total_cents, paid_cents, refunded_cents, customer_name, vehicle_note, created_at, issued_by')
    .order('created_at', { ascending: false })
    .limit(60);

  if (mine) query = query.eq('issued_by', profile.id);

  const { data: invoices } = await query;
  const rows = invoices ?? [];

  // Today's takings, so a mechanic can reconcile their tablet at close.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todays = rows.filter((i) => new Date(i.created_at) >= startOfToday);
  const takenToday = todays.reduce((sum, i) => sum + Number(i.paid_cents), 0);
  const outstanding = rows.reduce(
    (sum, i) => sum + Math.max(0, Number(i.total_cents) - Number(i.paid_cents)),
    0
  );

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/billing"
      title="Billing"
      subtitle="Raise a bill, take the payment, hand over a receipt."
      actions={
        <Link href="/worker/billing/new" className="btn">
          <Icon name="plus" size={16} /> New bill
        </Link>
      }
    >
      <section className="grid cols-3 rise" style={{ marginBottom: '2rem' }}>
        <div className="stat">
          <span className="stat__label">Bills today</span>
          <span className="stat__value">{todays.length}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Taken today</span>
          <span className="stat__value">{formatLKR(takenToday)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Still outstanding</span>
          <span className="stat__value">{formatLKR(outstanding)}</span>
        </div>
      </section>

      <div className="tabs rise">
        <Link href="/worker/billing" className="tab" data-active={!mine}>All bills</Link>
        <Link href="/worker/billing?show=mine" className="tab" data-active={mine}>Raised by me</Link>
      </div>

      {rows.length === 0 ? (
        <div className="empty rise" style={{ marginTop: '1.5rem' }}>
          <Icon name="receipt" size={30} />
          <h3>No bills yet</h3>
          <p className="muted small">Raise one when a job is finished, or for a walk-in.</p>
          <Link href="/worker/billing/new" className="btn">New bill</Link>
        </div>
      ) : (
        <div className="card rise table-wrap" style={{ marginTop: '1.5rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Number</th><th>Customer</th><th>Raised</th>
                <th className="right">Total</th><th className="right">Paid</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link href={`/worker/billing/${i.id}`} style={{ fontWeight: 600, color: 'var(--amber-600)' }}>
                      {i.number}
                    </Link>
                  </td>
                  <td>
                    {i.customer_name ?? <span className="muted">Walk-in</span>}
                    {i.vehicle_note && <><br /><span className="small muted">{i.vehicle_note}</span></>}
                  </td>
                  <td className="small">
                    {new Date(i.created_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="right">{formatLKR(i.total_cents)}</td>
                  <td className="right">{formatLKR(i.paid_cents)}</td>
                  <td>
                    <span className={`pill ${STATUS_TONE[i.status] ?? ''}`}>
                      {i.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}
