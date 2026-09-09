import Image from "next/image";
import Link from 'next/link';
import Icon from '@/components/Icon';
import { signOut } from '@/app/(auth)/actions';
import { BUSINESS } from '@/lib/business';
import NotificationBell from '@/components/NotificationBell';
import MobileNav from '@/components/MobileNav';
import AppUpdate from '@/components/AppUpdate';
import OfflineStatus from '@/components/OfflineStatus';

/**
 * The frame every signed-in page sits in. Navigation is passed in per portal
 * so customer / worker / admin never see each other's links.
 */
export default function PortalShell({ profile, nav, current, title, subtitle, actions, children }) {
  return (
    <div className="shell">
      <MobileNav nav={nav} current={current} profile={profile} />

      <nav className="shell__nav" aria-label="Portal navigation">

        <Link href={nav[0]?.href || '/'} className="row" style={{ fontWeight: 700, letterSpacing: '0.08em', color: '#fff', textDecoration: 'none' }}>
          <Image
            src="/logo-small.png"
            alt="DN Auto Logo"
            width={32}
            height={32}
            style={{ borderRadius: 8, objectFit: 'contain' }}
            priority
          />
          <span style={{ fontSize: '1.25rem' }}>{BUSINESS.shortName.toUpperCase()}</span>
        </Link>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.25rem' }}>
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="navlink"
                aria-current={item.href === current ? 'page' : undefined}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 'auto', display: 'grid', gap: '0.75rem' }}>
          <div className="small" style={{ color: 'var(--steel-300)' }}>
            <strong style={{ display: 'block', color: '#fff' }}>{profile.full_name}</strong>
            <span style={{ textTransform: 'capitalize' }}>{profile.role}</span>
          </div>
          <form action={signOut}>
            <button type="submit" className="btn btn--ghost small" style={{ width: '100%', color: 'var(--steel-200)' }}>
              <Icon name="logout" size={16} /> Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="shell__main">
        {/* Both render nothing in the ordinary case: OfflineStatus only when
            the connection is down or work is waiting to send, AppUpdate only
            inside the installed Android app when its shell is behind. */}
        <OfflineStatus />
        <AppUpdate />

        <header className="shell__head rise">
          <div>
            <h2 style={{ marginBottom: subtitle ? '0.2rem' : 0 }}>{title}</h2>
            {subtitle && <p className="muted" style={{ margin: 0 }}>{subtitle}</p>}
          </div>
          <div className="row">
            <NotificationBell userId={profile.id} />
            {actions}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
