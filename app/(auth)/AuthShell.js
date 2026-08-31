import Link from 'next/link';
import { BUSINESS } from '@/lib/business';

/** Shared split-screen frame for the login and signup screens. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth__aside">
        <Link href="/" className="row" style={{ fontWeight: 700, letterSpacing: '0.08em' }}>
          <span
            aria-hidden
            style={{
              width: 34,
              height: 34,
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

        <div className="rise">
          <h1 style={{ color: '#fff', maxWidth: '12ch' }}>
            Repairs done properly.
          </h1>
          <p style={{ color: 'var(--steel-300)', maxWidth: '46ch' }}>
            Certified mechanics, genuine parts and a {BUSINESS.partsWarrantyMonths}-month
            parts warranty. Serving Kadawatha since {BUSINESS.established}.
          </p>
        </div>

        <dl
          className="small"
          style={{ color: 'var(--steel-400)', display: 'grid', gap: '0.4rem', margin: 0 }}
        >
          <div>
            <dt style={{ display: 'inline', fontWeight: 600 }}>Sunday </dt>
            <dd style={{ display: 'inline', margin: 0 }}>8:00 AM – 5:00 PM</dd>
          </div>
          <div>
            <dt style={{ display: 'inline', fontWeight: 600 }}>Mon–Fri </dt>
            <dd style={{ display: 'inline', margin: 0 }}>
              Emergency repairs from 6:00 PM, existing customers
            </dd>
          </div>
          <div>
            <dt style={{ display: 'inline', fontWeight: 600 }}>Saturday </dt>
            <dd style={{ display: 'inline', margin: 0 }}>Closed</dd>
          </div>
        </dl>
      </aside>

      <main className="auth__panel">
        <div className="auth__card">
          <h2 style={{ marginBottom: '0.25rem' }}>{title}</h2>
          {subtitle && <p className="muted" style={{ marginTop: 0 }}>{subtitle}</p>}
          {children}
          {footer && (
            <p className="small muted center" style={{ marginTop: '1.5rem' }}>
              {footer}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
