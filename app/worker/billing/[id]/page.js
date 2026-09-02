import Link from 'next/link';
import { notFound } from 'next/navigation';
import PortalShell from '@/components/PortalShell';
import Icon from '@/components/Icon';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../../nav';
import { BUSINESS, formatLKR } from '@/lib/business';
import PrintButton from '@/components/PrintButton';
import PaymentPanel from './PaymentPanel';
import RefundPanel from './RefundPanel';

export const metadata = { title: 'Bill' };

export default async function InvoicePage({ params, searchParams }) {
  const { profile } = await requireRole(['worker', 'admin'], {
    from: `/worker/billing/${params.id}`,
  });
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      id, number, status, subtotal_cents, discount_cents, tax_cents, total_cents,
      paid_cents, refunded_cents, customer_name, customer_phone, vehicle_note,
      notes, created_at, booking_id,
      invoice_items(id, description, kind, quantity, unit_price_cents, warranty_months, sort_order),
      promotions(name, code),
      issuer:profiles!invoices_issued_by_fkey(full_name)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!invoice) notFound();

  const [{ data: payments }, { data: refunds }] = await Promise.all([
    supabase
      .from('payments')
      .select('id, provider, status, amount_cents, provider_reference, paid_at')
      .eq('invoice_id', invoice.id)
      .order('created_at'),
    supabase
      .from('refunds')
      .select('id, amount_cents, reason, created_at, refunded_by, profiles:refunded_by(full_name)')
      .eq('invoice_id', invoice.id)
      .order('created_at', { ascending: false }),
  ]);

  const items = [...(invoice.invoice_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const outstanding = Number(invoice.total_cents) - Number(invoice.paid_cents);
  const settled = searchParams?.settled;

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/billing"
      title={invoice.number}
      subtitle={`Raised by ${invoice.issuer?.full_name ?? 'the workshop'} · ${new Date(invoice.created_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}`}
      actions={
        <span className={`pill ${outstanding <= 0 ? 'pill--ok' : 'pill--warn'}`}>
          {outstanding <= 0 ? 'Settled' : `${formatLKR(outstanding)} due`}
        </span>
      }
    >
      {settled === 'paid' && (
        <p className="form-note rise">Payment recorded. Print the receipt for the customer.</p>
      )}
      {settled === 'declined' && (
        <p className="form-error rise">The machine declined that one. Try again or take cash.</p>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', alignItems: 'start' }}>
        <div className="stack" style={{ '--gap': '1.5rem' }}>
          {/* The printable receipt. Everything else is hidden by the print CSS. */}
          <section className="card rise receipt">
            <header className="receipt__head">
              <div>
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
                  {BUSINESS.name}
                </strong>
                <p className="small muted" style={{ margin: 0 }}>
                  {BUSINESS.address.line1}, {BUSINESS.address.city} {BUSINESS.address.postcode}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>{invoice.number}</strong>
                <p className="small muted" style={{ margin: 0 }}>
                  {new Date(invoice.created_at).toLocaleDateString('en-LK', { dateStyle: 'long' })}
                </p>
              </div>
            </header>

            <div className="receipt__meta small">
              <span><strong>Customer:</strong> {invoice.customer_name ?? 'Walk-in'}</span>
              {invoice.customer_phone && <span><strong>Phone:</strong> {invoice.customer_phone}</span>}
              {invoice.vehicle_note && <span><strong>Vehicle:</strong> {invoice.vehicle_note}</span>}
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Item</th><th>Qty</th><th className="right">Unit</th><th className="right">Amount</th></tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.description}
                        {item.warranty_months > 0 && (
                          <span className="pill pill--ok" style={{ marginLeft: '0.5rem' }}>
                            {item.warranty_months}-month warranty
                          </span>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td className="right">{formatLKR(item.unit_price_cents)}</td>
                      <td className="right">{formatLKR(item.unit_price_cents * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3}>Subtotal</td><td className="right">{formatLKR(invoice.subtotal_cents)}</td></tr>
                  {invoice.discount_cents > 0 && (
                    <tr className="table__discount">
                      <td colSpan={3}>
                        Discount{invoice.promotions ? ` — ${invoice.promotions.name}` : ''}
                      </td>
                      <td className="right">−{formatLKR(invoice.discount_cents)}</td>
                    </tr>
                  )}
                  <tr><th colSpan={3}>Total</th><th className="right">{formatLKR(invoice.total_cents)}</th></tr>
                  <tr><td colSpan={3}>Paid</td><td className="right">{formatLKR(invoice.paid_cents)}</td></tr>
                  {invoice.refunded_cents > 0 && (
                    <tr className="table__discount">
                      <td colSpan={3}>Refunded</td>
                      <td className="right">−{formatLKR(invoice.refunded_cents)}</td>
                    </tr>
                  )}
                  {outstanding > 0 && (
                    <tr><th colSpan={3}>Still due</th><th className="right">{formatLKR(outstanding)}</th></tr>
                  )}
                </tfoot>
              </table>
            </div>

            {invoice.notes && <p className="small muted">{invoice.notes}</p>}

            <p className="small muted receipt__foot">
              Parts carry a {BUSINESS.partsWarrantyMonths}-month minimum warranty. Thank you
              for your business.
            </p>
          </section>

          <section className="card rise rise-1">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>Payments</h3>
              <PrintButton />
            </div>

            {(payments ?? []).length === 0 ? (
              <p className="muted small" style={{ margin: '0.75rem 0 0' }}>Nothing taken yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Method</th><th>Reference</th><th>When</th><th className="right">Amount</th><th /></tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td style={{ textTransform: 'capitalize' }}>{p.provider.replace('_', ' ')}</td>
                        <td className="small muted">{p.provider_reference ?? '—'}</td>
                        <td className="small">
                          {new Date(p.paid_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="right">{formatLKR(p.amount_cents)}</td>
                        <td><RefundPanel payment={p} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(refunds ?? []).length > 0 && (
              <>
                <h4 style={{ marginTop: '1.5rem' }}>Refunds</h4>
                <ul className="small" style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {refunds.map((r) => (
                    <li key={r.id}>
                      {formatLKR(r.amount_cents)} — {r.reason}
                      <span className="muted">
                        {' '}· {r.profiles?.full_name ?? 'staff'} ·{' '}
                        {new Date(r.created_at).toLocaleDateString('en-LK')}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        <aside className="stack rise rise-2" style={{ '--gap': '1.5rem' }}>
          {outstanding > 0 ? (
            <PaymentPanel invoiceId={invoice.id} outstandingCents={outstanding} />
          ) : (
            <section className="card center">
              <div className="tick" aria-hidden><Icon name="check" size={28} /></div>
              <h3>Settled</h3>
              <p className="small muted">Print the receipt and hand the keys over.</p>
              <PrintButton />
            </section>
          )}

          {invoice.booking_id && (
            <section className="card">
              <h3>Linked job</h3>
              <Link href={`/worker/jobs/${invoice.booking_id}`} className="btn btn--ghost small">
                Open the job <Icon name="arrowRight" size={14} />
              </Link>
            </section>
          )}
        </aside>
      </div>
    </PortalShell>
  );
}
