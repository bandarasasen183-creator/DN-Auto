import Link from 'next/link';
import { signOut } from '@/app/(auth)/actions';
import { BUSINESS } from '@/lib/business';
import DnAssist from '@/components/assistant/DnAssist';
import NotificationBell from '@/components/NotificationBell';
import MobileNav from '@/components/MobileNav';

/**
 * The frame every signed-in page sits in. Navigation is passed in per portal
 * so customer / worker / admin never see each other's links.
 */
export default function PortalShell({ profile, nav, current, title, subtitle, actions, children }) {
  return (
    <div className="shell">
      <MobileNav nav={nav} current={current} profile={profile} />

      <nav className="shell__nav" aria-label="Portal navigation">
        <Link href="/" className="row" style={{ fontWeight: 700, letterSpacing: '0.08em', color: '#fff' }}>
          <span
            aria-hidden
            style={{
              width: 32,
              height: 32,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 8,
              background: 'var(--amber-500)',
              color: 'var(--ink-900)',
              fontFamily: 'var(--font-display)',
            }}
          >
            DN
          </span>
          <span>{BUSINESS.shortName.toUpperCase()}</span>
        </Link>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.25rem' }}>
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="navlink"
                aria-current={item.href === current ? 'page' : undefined}
              >
                <span aria-hidden>{item.icon}</span>
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
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="shell__main">
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

      <DnAssist signedIn />
    </div>
  );
}
