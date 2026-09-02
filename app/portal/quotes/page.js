import PortalShell from '@/components/PortalShell';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { CUSTOMER_NAV } from '../nav';
import { formatLKR } from '@/lib/business';
import QuoteDecision from './QuoteDecision';

export const metadata = { title: 'Quotes' };

export default async function QuotesPage() {
  const { profile } = await requireRole('customer', { from: '/portal/quotes' });
  const supabase = createClient();

  const { data: quotes } = await supabase
    .from('quotes')
    .select(`
      id, status, subtotal_cents, tax_cents, discount_cents, total_cents, valid_until, notes, created_at,
      bookings(reference, services(name)),
      quote_items(id, description, kind, quantity, unit_price_cents, warranty_months)
    `)
    .order('created_at', { ascending: false });

  return (
    <PortalShell
      profile={profile}
      nav={CUSTOMER_NAV}
      current="/portal/quotes"
      title="Quotes"
      subtitle="Nothing gets fixed until you say yes. Approve or decline each quote here."
    >
      {(quotes ?? []).length === 0 ? (
        <div className="card center muted rise">No quotes yet.</div>
      ) : (
        <div className="grid rise" style={{ gap: '1.25rem' }}>
          {quotes.map((q) => (
            <article key={q.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <strong>{q.bookings?.services?.name ?? 'Repair'}</strong>
                  <p className="small muted" style={{ margin: 0 }}>
                    {q.bookings?.reference}
                    {q.valid_until ? ` · valid until ${q.valid_until}` : ''}
                  </p>
                </div>
                <span className={`pill ${q.status === 'approved' ? 'pill--ok' : q.status === 'rejected' ? 'pill--bad' : q.status === 'sent' ? 'pill--warn' : ''}`}>
                  {q.status}
                </span>
              </div>

              <table className="table">
                <thead>
                  <tr><th>Item</th><th>Type</th><th>Qty</th><th className="right">Amount</th></tr>
                </thead>
                <tbody>
                  {q.quote_items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.description}
                        {item.warranty_months > 0 && (
                          <span className="pill pill--ok" style={{ marginLeft: '0.5rem' }}>
                            {item.warranty_months}-month warranty
                          </span>
                        )}
                      </td>
                      <td className="muted small">{item.kind}</td>
                      <td>{item.quantity}</td>
                      <td className="right">{formatLKR(item.unit_price_cents * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3}>Subtotal</td><td className="right">{formatLKR(q.subtotal_cents)}</td></tr>
                  {q.discount_cents > 0 && (
                    <tr className="table__discount">
                      <td colSpan={3}>Discount applied</td>
                      <td className="right">−{formatLKR(q.discount_cents)}</td>
                    </tr>
                  )}
                  {q.tax_cents > 0 && (
                    <tr><td colSpan={3}>Tax</td><td className="right">{formatLKR(q.tax_cents)}</td></tr>
                  )}
                  <tr><th colSpan={3}>Total</th><th className="right">{formatLKR(q.total_cents)}</th></tr>
                </tfoot>
              </table>

              {q.notes && <p className="small muted">{q.notes}</p>}
              {q.status === 'sent' && <QuoteDecision quoteId={q.id} />}
            </article>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
