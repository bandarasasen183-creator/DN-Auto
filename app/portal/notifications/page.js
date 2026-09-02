import Link from 'next/link';
import PortalShell from '@/components/PortalShell';
import Icon from '@/components/Icon';
import { requireRole } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { CUSTOMER_NAV } from '../nav';
import { markAllNotificationsRead } from '../actions';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const { profile } = await requireRole('customer', { from: '/portal/notifications' });
  const supabase = createClient();

  const { data: items } = await supabase
    .from('notifications')
    .select('id, title, body, link, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(60);

  const unread = (items ?? []).filter((n) => !n.read_at).length;

  return (
    <PortalShell
      profile={profile}
      nav={CUSTOMER_NAV}
      current="/portal/notifications"
      title="Notifications"
      subtitle="Every update on your bookings, newest first."
      actions={
        unread > 0 ? (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="btn btn--ghost">
              <Icon name="check" size={16} /> Mark all read
            </button>
          </form>
        ) : null
      }
    >
      {(items ?? []).length === 0 ? (
        <div className="empty rise">
          <Icon name="bell" size={30} />
          <h3>Nothing yet</h3>
          <p className="muted small">
            When your booking is confirmed, assigned or completed, it lands here.
          </p>
          <Link href="/portal/book" className="btn">Book a service</Link>
        </div>
      ) : (
        <ul className="notilist rise">
          {items.map((n) => (
            <li key={n.id} className="notilist__item" data-unread={!n.read_at}>
              <span className="notilist__icon" aria-hidden>
                <Icon name={n.read_at ? 'info' : 'bell'} size={18} />
              </span>
              <div>
                <strong>{n.title}</strong>
                {n.body && <p className="small muted" style={{ margin: 0 }}>{n.body}</p>}
                <p className="small muted" style={{ margin: '0.2rem 0 0' }}>
                  {new Date(n.created_at).toLocaleString('en-LK', {
                    dateStyle: 'medium', timeStyle: 'short',
                  })}
                </p>
              </div>
              {n.link && (
                <Link href={n.link} className="btn btn--ghost small">
                  View <Icon name="arrowRight" size={14} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}
