import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, ROLE_HOME } from '@/lib/auth/session';
import { BUSINESS, EXCLUSIONS, HOURS, formatLKR } from '@/lib/business';
import Reveal from '@/components/Reveal';

export default async function HomePage() {
  const supabase = createClient();
  const [{ data: services }, session] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, description, base_price_cents, price_is_from, category')
      .eq('is_active', true)
      .order('sort_order'),
    getSessionUser(),
  ]);

  const portalHref = session ? ROLE_HOME[session.profile.role] : '/login';
  const portalLabel = session ? 'Go to your portal' : 'Sign in';

  return (
    <>
      <Reveal />

      <header
        style={{
          position: 'relative',
          color: 'var(--steel-100)',
          background:
            'radial-gradient(90% 70% at 80% 0%, rgb(245 165 36 / 0.18), transparent 60%),' +
            'linear-gradient(165deg, var(--ink-800), var(--ink-900))',
          overflow: 'hidden',
        }}
      >
        <nav className="container row" style={{ justifyContent: 'space-between', paddingBlock: '1.25rem' }}>
          <Link href="/" className="row" style={{ fontWeight: 700, letterSpacing: '0.08em', color: '#fff' }}>
            <span
              aria-hidden
              style={{
                width: 34, height: 34, display: 'grid', placeItems: 'center',
                borderRadius: 8, background: 'var(--amber-500)', color: 'var(--ink-900)',
                fontFamily: 'var(--font-display)',
              }}
            >
              DN
            </span>
            {BUSINESS.shortName.toUpperCase()}
          </Link>
          <Link href={portalHref} className="btn">{portalLabel}</Link>
        </nav>

        <div className="container" style={{ paddingBlock: 'clamp(3rem, 9vw, 7rem)' }}>
          <p className="rise" style={{ letterSpacing: '0.24em', fontSize: '0.8rem', color: 'var(--amber-400)', margin: 0 }}>
            KADAWATHA · SINCE {BUSINESS.established}
          </p>
          <h1 className="rise rise-1" style={{ color: '#fff', maxWidth: '16ch' }}>
            Your car, fixed properly.
          </h1>
          <p className="rise rise-2" style={{ maxWidth: '54ch', color: 'var(--steel-300)', fontSize: '1.1rem' }}>
            Certified mechanics, real diagnostic equipment and genuine parts backed by a{' '}
            {BUSINESS.partsWarrantyMonths}-month warranty. We repair petrol vehicles — that is all
            we do, and we do it well.
          </p>
          <div className="row rise rise-3" style={{ marginTop: '2rem', flexWrap: 'wrap' }}>
            <Link href={session ? '/portal/book' : '/signup'} className="btn">
              Book a service
            </Link>
            <a href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer" className="btn btn--ghost" style={{ color: 'var(--steel-100)' }}>
              Find the workshop
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="container" style={{ paddingBlock: '4rem' }}>
          <h2 className="reveal">What we do</h2>
          <p className="muted reveal" style={{ maxWidth: '58ch' }}>
            Guide prices in {BUSINESS.currency}. The final figure always comes from a written
            quote after we have seen the vehicle — no surprises on collection.
          </p>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', marginTop: '2rem' }}>
            {(services ?? []).map((s) => (
              <article key={s.id} className="card card--hover reveal">
                <span className="pill">{s.category}</span>
                <h3 style={{ marginTop: '0.75rem' }}>{s.name}</h3>
                <p className="small muted">{s.description}</p>
                <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>
                  {s.price_is_from ? 'From ' : ''}
                  {formatLKR(s.base_price_cents)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ background: 'var(--ink-900)', color: 'var(--steel-200)' }}>
          <div className="container grid" style={{ paddingBlock: '4rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div className="reveal">
              <h2 style={{ color: '#fff' }}>Opening hours</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                {Object.values(HOURS).map((h) => (
                  <li key={h.label} className="row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--ink-600)', paddingBottom: '0.5rem' }}>
                    <span>{h.label}</span>
                    <span className="small" style={{ color: h.kind === 'closed' ? 'var(--steel-400)' : 'var(--amber-400)' }}>
                      {h.kind === 'closed'
                        ? 'Closed'
                        : h.kind === 'emergency'
                          ? `${h.open}–${h.close} · emergencies, existing customers`
                          : `${h.open}–${h.close}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="reveal">
              <h2 style={{ color: '#fff' }}>What we don&apos;t do</h2>
              <p className="small" style={{ color: 'var(--steel-400)' }}>
                We would rather tell you straight than take your money for work we are not set
                up for. For these, we&apos;re happy to point you somewhere good.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
                {EXCLUSIONS.map((x) => (
                  <li key={x} className="row">
                    <span aria-hidden style={{ color: 'var(--bad)' }}>✕</span> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ background: 'var(--ink-800)', color: 'var(--steel-400)', paddingBlock: '2.5rem' }}>
        <div className="container small">
          <strong style={{ color: '#fff', display: 'block' }}>{BUSINESS.name}</strong>
          {BUSINESS.address.line1}, {BUSINESS.address.city} {BUSINESS.address.postcode},{' '}
          {BUSINESS.address.province}, {BUSINESS.address.country}
        </div>
      </footer>
    </>
  );
}
