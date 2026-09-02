import PortalShell from '@/components/PortalShell';
import Icon from '@/components/Icon';
import Stars from '@/components/Stars';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_NAV } from '../nav';
import { setReviewPublished } from '../actions';
import ReviewReply from './ReviewReply';

export const metadata = { title: 'Reviews' };

export default async function AdminReviews() {
  const { profile } = await requireRole('admin', { from: '/admin/reviews' });
  const supabase = createClient();

  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id, rating, body, is_published, reply, created_at,
      author:profiles!reviews_author_id_fkey(full_name),
      bookings(reference, services(name))
    `)
    .order('created_at', { ascending: false });

  const rows = reviews ?? [];
  const published = rows.filter((r) => r.is_published).length;
  const average = rows.length
    ? (rows.reduce((sum, r) => sum + r.rating, 0) / rows.length).toFixed(1)
    : '—';

  return (
    <PortalShell
      profile={profile}
      nav={ADMIN_NAV}
      current="/admin/reviews"
      title="Reviews"
      subtitle="Nothing appears on the public site until you publish it."
    >
      <section className="grid cols-3 rise" style={{ marginBottom: '2rem' }}>
        <div className="stat"><span className="stat__label">Reviews</span><span className="stat__value">{rows.length}</span></div>
        <div className="stat"><span className="stat__label">Published</span><span className="stat__value">{published}</span></div>
        <div className="stat"><span className="stat__label">Average rating</span><span className="stat__value">{average}</span></div>
      </section>

      {rows.length === 0 ? (
        <div className="empty rise">
          <Icon name="star" size={30} />
          <h3>No reviews yet</h3>
          <p className="muted small">
            Customers can review a job once it is marked complete.
          </p>
        </div>
      ) : (
        <div className="grid rise" style={{ gap: '1rem' }}>
          {rows.map((r) => (
            <article key={r.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <Stars value={r.rating} />
                  <p className="small muted" style={{ margin: '0.3rem 0 0' }}>
                    {r.author?.full_name} · {r.bookings?.services?.name} · {r.bookings?.reference}
                  </p>
                </div>
                <div className="row">
                  <span className={`pill ${r.is_published ? 'pill--ok' : ''}`}>
                    {r.is_published ? 'Published' : 'Hidden'}
                  </span>
                  <form action={setReviewPublished}>
                    <input type="hidden" name="review_id" value={r.id} />
                    <input type="hidden" name="publish" value={r.is_published ? 'false' : 'true'} />
                    <button type="submit" className="btn btn--ghost small">
                      {r.is_published ? 'Hide' : 'Publish'}
                    </button>
                  </form>
                </div>
              </div>

              {r.body && <p style={{ marginBottom: '0.5rem' }}>{r.body}</p>}
              <ReviewReply reviewId={r.id} reply={r.reply} />
            </article>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
