import PortalShell from '@/components/PortalShell';
import Icon from '@/components/Icon';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { WORKER_NAV } from '../../nav';
import { describeValue } from '@/lib/promotions';
import TeamCodeForm from './TeamCodeForm';

export const metadata = { title: 'Promo codes' };

export default async function TeamCodesPage() {
  const { profile } = await requireRole(['worker', 'admin'], { from: '/worker/billing/codes' });
  const supabase = createClient();

  const { data: promotions } = await supabase
    .from('promotions')
    .select('id, code, name, kind, value, is_active, ends_on, usage_limit, created_at, creator:profiles!promotions_created_by_fkey(full_name)')
    .eq('trigger', 'code')
    .order('created_at', { ascending: false })
    .limit(40);

  return (
    <PortalShell
      profile={profile}
      nav={WORKER_NAV}
      current="/worker/billing/codes"
      title="Promo codes"
      subtitle="Codes you can give a customer at the counter."
    >
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 1fr)', alignItems: 'start' }}>
        <div className="rise">
          {(promotions ?? []).length === 0 ? (
            <div className="empty">
              <Icon name="star" size={30} />
              <h3>No codes yet</h3>
              <p className="muted small">Create one and it works straight away, here and online.</p>
            </div>
          ) : (
            <div className="card table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Code</th><th>What it gives</th><th>Made by</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {(promotions ?? []).map((p) => (
                    <tr key={p.id}>
                      <td><strong style={{ letterSpacing: '0.06em' }}>{p.code}</strong></td>
                      <td>
                        {describeValue(p)}
                        <br /><span className="small muted">{p.name}</span>
                      </td>
                      <td className="small muted">{p.creator?.full_name ?? '—'}</td>
                      <td>
                        <span className={`pill ${p.is_active ? 'pill--ok' : ''}`}>
                          {p.is_active ? 'Live' : 'Off'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <TeamCodeForm isAdmin={profile.role === 'admin'} />
      </div>
    </PortalShell>
  );
}
