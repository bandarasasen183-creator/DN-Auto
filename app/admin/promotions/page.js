import PortalShell from '@/components/PortalShell';
import Icon from '@/components/Icon';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_NAV } from '../nav';
import { formatLKR } from '@/lib/business';
import { describeValue } from '@/lib/promotions';
import { togglePromotion } from '../actions';
import PromotionEditor from './PromotionEditor';

export const metadata = { title: 'Promotions' };

const TRIGGER_LABELS = {
  code: 'Customer types a code',
  first_booking: 'Automatic on a first booking',
  referral: 'Referral code from another customer',
  always: 'Applied to every booking',
};

export default async function AdminPromotions() {
  const { profile } = await requireRole('admin', { from: '/admin/promotions' });
  const supabase = createClient();

  const [{ data: promotions }, { data: redemptions }] = await Promise.all([
    supabase.from('promotions').select('*').order('created_at', { ascending: false }),
    supabase.from('promotion_redemptions').select('promotion_id, discount_cents'),
  ]);

  // Redemption counts and money given away, per promotion.
  const stats = (redemptions ?? []).reduce((acc, r) => {
    const row = (acc[r.promotion_id] ??= { count: 0, total: 0 });
    row.count += 1;
    row.total += Number(r.discount_cents);
    return acc;
  }, {});

  const givenAway = Object.values(stats).reduce((sum, s) => sum + s.total, 0);

  return (
    <PortalShell
      profile={profile}
      nav={ADMIN_NAV}
      current="/admin/promotions"
      title="Promotions"
      subtitle="Every discount the site can offer. Nothing is hard-coded — this page is the switch."
    >
      <section className="grid cols-3 rise" style={{ marginBottom: '2rem' }}>
        <div className="stat">
          <span className="stat__label">Promotions</span>
          <span className="stat__value">{(promotions ?? []).length}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Live right now</span>
          <span className="stat__value">{(promotions ?? []).filter((p) => p.is_active).length}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Discount given</span>
          <span className="stat__value">{formatLKR(givenAway)}</span>
        </div>
      </section>

      <div className="grid rise" style={{ gap: '1rem' }}>
        {(promotions ?? []).map((p) => (
          <article key={p.id} className="card">
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div className="row">
                  <span className="promise__icon" aria-hidden style={{ margin: 0, width: 36, height: 36 }}>
                    <Icon name="star" size={18} />
                  </span>
                  <div>
                    <strong>{p.name}</strong>
                    <p className="small muted" style={{ margin: 0 }}>
                      {describeValue(p)} · {TRIGGER_LABELS[p.trigger]}
                      {p.code ? ` · code ${p.code}` : ''}
                    </p>
                  </div>
                </div>
                {p.description && (
                  <p className="small muted" style={{ margin: '0.6rem 0 0' }}>{p.description}</p>
                )}
              </div>

              <div className="row">
                <span className="small muted">
                  {(stats[p.id]?.count ?? 0)} used · {formatLKR(stats[p.id]?.total ?? 0)}
                </span>
                <span className={`pill ${p.is_active ? 'pill--ok' : ''}`}>
                  {p.is_active ? 'Live' : 'Off'}
                </span>
                <form action={togglePromotion}>
                  <input type="hidden" name="promotion_id" value={p.id} />
                  <input type="hidden" name="active" value={p.is_active ? 'false' : 'true'} />
                  <button type="submit" className="btn btn--ghost small">
                    {p.is_active ? 'Turn off' : 'Turn on'}
                  </button>
                </form>
              </div>
            </div>

            <PromotionEditor promotion={p} />
          </article>
        ))}

        <PromotionEditor />
      </div>
    </PortalShell>
  );
}
