import Link from 'next/link';
import PortalShell from '@/components/PortalShell';
import Icon from '@/components/Icon';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../nav';
import { fetchServiceHistory, isWarrantyLive } from '@/lib/service-history';
import { formatLKR } from '@/lib/business';
import SearchForm from './SearchForm';

export const metadata = { title: 'Service History' };
export const dynamic = 'force-dynamic';

export default async function HistoryPage({ searchParams }) {
  const { profile } = await requireRole(['worker', 'admin'], { from: '/worker/history' });
  const supabase = createClient();
  const q = searchParams?.q || '';

  let history = null;
  if (q) {
    history = await fetchServiceHistory(supabase, q);
  }

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/history"
      title="Service History"
      subtitle="Search for any vehicle to see every job and warranty on record."
    >
      <section className="rise">
        <SearchForm />

        {history && (
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
            <div className="stack" style={{ '--gap': '1.5rem' }}>
              <h2>Jobs History ({history.invoices.length})</h2>
              {history.invoices.length === 0 ? (
                <p className="muted">No jobs on record for this vehicle.</p>
              ) : (
                history.invoices.map((invoice) => (
                  <div key={invoice.id} className="card">
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <strong>{new Date(invoice.created_at).toLocaleDateString('en-LK', { dateStyle: 'long' })}</strong>
                        <p className="small muted" style={{ margin: 0 }}>
                          {invoice.number} {invoice.mechanic?.full_name ? `· ${invoice.mechanic.full_name}` : ''}
                        </p>
                      </div>
                      <div className="right">
                        <strong>{formatLKR(invoice.total_cents)}</strong>
                      </div>
                    </div>
                    
                    <ul className="small" style={{ margin: 0, paddingLeft: '1.2rem' }}>
                      {invoice.invoice_items.map(item => (
                        <li key={item.id} style={{ marginBottom: '4px' }}>
                          {item.description} {item.quantity > 1 ? `× ${item.quantity}` : ''}
                          {item.warranty_months > 0 && (
                            <span className="form-note" style={{ marginLeft: '8px' }}>
                              ({item.warranty_months}mo warranty)
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {invoice.notes && (
                      <div className="small muted" style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-sunken)', borderRadius: '6px' }}>
                        {invoice.notes}
                      </div>
                    )}
                    <div style={{ marginTop: '1rem' }}>
                       <Link href={`/worker/billing/${invoice.id}`} className="btn btn--ghost small">View invoice</Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="stack" style={{ '--gap': '1.5rem' }}>
              <h2>Warranties</h2>
              {history.warranties.length === 0 ? (
                <p className="muted small">No warranties on record.</p>
              ) : (
                <div className="stack" style={{ '--gap': '0.75rem' }}>
                  {history.warranties.map(w => {
                    const live = isWarrantyLive(w);
                    return (
                      <div key={w.id} className="card" style={{ padding: '1rem' }}>
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                          <strong>{w.description}</strong>
                          <span className={`pill ${w.is_void ? '' : live ? 'pill--ok' : 'pill--warn'} small`}>
                            {w.is_void ? 'Void' : live ? 'Active' : 'Expired'}
                          </span>
                        </div>
                        <p className="small muted" style={{ margin: '0.5rem 0' }}>
                          {w.number} · Fitted {new Date(w.starts_on).toLocaleDateString('en-LK')}
                        </p>
                        <p className={`small ${live ? 'form-note' : 'muted'}`} style={{ margin: 0 }}>
                          {live ? `Covered until ${new Date(w.expires_on).toLocaleDateString('en-LK')}` : `Expired ${new Date(w.expires_on).toLocaleDateString('en-LK')}`}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </PortalShell>
  );
}
