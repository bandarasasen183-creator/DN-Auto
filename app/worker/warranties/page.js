import Link from 'next/link';
import PortalShell from '@/components/PortalShell';
import Icon from '@/components/Icon';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../nav';
import { isWarrantyLive } from '@/lib/service-history';

export const metadata = { title: 'Warranty Register' };
export const dynamic = 'force-dynamic';

export default async function WarrantiesPage({ searchParams }) {
  const { profile } = await requireRole(['worker', 'admin'], { from: '/worker/warranties' });
  const supabase = createClient();
  const q = searchParams?.q || '';

  let query = supabase
    .from('warranties')
    .select('id, number, registration, description, starts_on, expires_on, is_void')
    .order('expires_on', { ascending: false });

  if (q) {
    query = query.ilike('plate_key', `%${q.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}%`);
  } else {
    query = query.limit(100);
  }

  const { data: warranties } = await query;

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/warranties"
      title="Warranty Register"
      subtitle="Active and expired warranties against vehicles."
    >
      <section className="card rise">
        <form method="GET" className="row" style={{ marginBottom: '1.5rem', flexWrap: 'nowrap' }}>
          <input 
            type="search" 
            name="q" 
            defaultValue={q} 
            placeholder="Search by plate..." 
            className="input" 
            style={{ textTransform: 'uppercase' }} 
          />
          <button type="submit" className="btn">Search</button>
        </form>

        <div className="table-responsive">
          <table className="table table--striped">
            <thead>
              <tr>
                <th>Plate</th>
                <th>Part / Service</th>
                <th>Fitted</th>
                <th>Expires</th>
                <th>Status</th>
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(warranties ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="center muted" style={{ padding: '2rem 0' }}>
                    {q ? 'No warranties found for that plate.' : 'No warranties on record.'}
                  </td>
                </tr>
              ) : (
                warranties.map((w) => {
                  const live = isWarrantyLive(w);
                  return (
                    <tr key={w.id}>
                      <td><strong>{w.registration}</strong></td>
                      <td>
                        {w.description}
                        <br />
                        <span className="small muted">{w.number}</span>
                      </td>
                      <td className="small">{new Date(w.starts_on).toLocaleDateString('en-LK')}</td>
                      <td className="small">{new Date(w.expires_on).toLocaleDateString('en-LK')}</td>
                      <td>
                        <span className={`pill ${w.is_void ? '' : live ? 'pill--ok' : 'pill--warn'}`}>
                          {w.is_void ? 'Void' : live ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="right">
                        <Link href={`/worker/history?q=${w.registration}`} className="btn btn--ghost small">
                          History
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PortalShell>
  );
}
