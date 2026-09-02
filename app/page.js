import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, ROLE_HOME } from '@/lib/auth/session';
import { BUSINESS, HOURS, PROMISES, PROCESS } from '@/lib/business';
import Reveal from '@/components/Reveal';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import DnAssist from '@/components/assistant/DnAssist';

export default async function HomePage() {
  const supabase = createClient();
  const [{ data: services }, session] = await Promise.all([
    supabase
      .from('services')
      .select('id, slug, name, description, base_price_cents, price_is_from, category, duration_minutes')
      .eq('is_active', true)
      .order('sort_order'),
    getSessionUser(),
  ]);

  const portalHref = session ? ROLE_HOME[session.profile.role] : '/login';
  const portalLabel = session ? 'My portal' : 'Sign in';
  const bookHref = session ? '/portal/book' : '/signup';

  const yearsTrading = new Date().getFullYear() - BUSINESS.established;

  return (
    <>
      <Reveal />
      <SiteHeader portalHref={portalHref} portalLabel={portalLabel} />

      {/* ---------------- Hero ---------------- */}
      <section className="hero">
        <div className="container hero__inner">
          <p className="hero__eyebrow rise">
            KADAWATHA · SINCE {BUSINESS.established}
          </p>
          <h1 className="rise rise-1">
            Your car,<br />fixed properly.
          </h1>
          <p className="hero__lead rise rise-2">
            Certified mechanics, real diagnostic equipment and genuine parts backed by a{' '}
            {BUSINESS.partsWarrantyMonths}-month warranty. We repair petrol vehicles — that
            is all we do, and we do it well.
          </p>

          <div className="row rise rise-3" style={{ marginTop: '2rem', flexWrap: 'wrap' }}>
            <Link href={bookHref} className="btn btn--lg">Book a service</Link>
            <Link href="/services" className="btn btn--ghost btn--lg btn--onDark">
              What we do
            </Link>
          </div>

          <dl className="hero__stats rise rise-4">
            <div>
              <dt>{yearsTrading}+</dt>
              <dd>years in Kadawatha</dd>
            </div>
            <div>
              <dt>{BUSINESS.partsWarrantyMonths}</dt>
              <dd>month parts warranty</dd>
            </div>
            <div>
              <dt>{(services ?? []).length}</dt>
              <dd>services offered</dd>
            </div>
          </dl>
        </div>

      </section>

      <main>
        {/* ---------------- Promises ---------------- */}
        <section className="container section">
          <p className="eyebrow reveal">Our standards</p>
          <h2 className="reveal">Why customers come back</h2>
          <div className="grid cols-4" style={{ marginTop: '2rem' }}>
            {PROMISES.map((p) => (
              <article key={p.title} className="card card--hover reveal">
                <h3>{p.title}</h3>
                <p className="small muted" style={{ margin: 0 }}>{p.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------------- Services ---------------- */}
        <section className="band">
          <div className="container section">
            <div className="section__head reveal">
              <div>
                <p className="eyebrow">What we do</p>
                <h2>Repairs and servicing</h2>
                <p className="muted" style={{ maxWidth: '58ch' }}>
                  Engine, brakes, electrical, transmission and full servicing for petrol
                  vehicles — diagnosed properly before anything is replaced.
                </p>
              </div>
              <Link href="/services" className="btn btn--ghost">See all services →</Link>
            </div>

            <div className="grid cols-3" style={{ marginTop: '2rem' }}>
              {(services ?? []).slice(0, 6).map((s) => (
                <article key={s.id} className="card card--hover reveal servicecard">
                  <span className="pill">{s.category}</span>
                  <h3>{s.name}</h3>
                  <p className="small muted">{s.description}</p>
                  <div className="servicecard__foot">
                    <span className="small muted">Typically about {s.duration_minutes} minutes</span>
                  </div>
                  <Link href={bookHref} className="servicecard__cta">Book this →</Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Process ---------------- */}
        <section className="container section">
          <p className="eyebrow reveal">How it works</p>
          <h2 className="reveal">How a job runs</h2>
          <ol className="process" style={{ marginTop: '2rem' }}>
            {PROCESS.map((p, i) => (
              <li key={p.step} className="process__item reveal">
                <span className="process__num" aria-hidden>{i + 1}</span>
                <h3>{p.step}</h3>
                <p className="small muted" style={{ margin: 0 }}>{p.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------- Hours & warranty ---------------- */}
        <section className="band band--dark">
          <div className="container section grid cols-2">
            <div className="reveal">
              <p className="eyebrow">When we&apos;re open</p>
              <h2 style={{ color: '#fff' }}>Opening hours</h2>
              <ul className="hourlist">
                {Object.values(HOURS).map((h) => (
                  <li key={h.label} data-kind={h.kind}>
                    <span>{h.label}</span>
                    <span>
                      {h.kind === 'closed'
                        ? 'Closed'
                        : h.kind === 'emergency'
                          ? `${h.open}–${h.close} · emergencies, existing customers`
                          : `${h.open}–${h.close}`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="small" style={{ color: 'var(--steel-400)' }}>
                Sunday is our main service day. Weekday evenings are kept free for existing
                customers with an emergency.
              </p>
            </div>

            <div className="reveal">
              <p className="eyebrow">Our guarantee</p>
              <h2 style={{ color: '#fff' }}>
                {BUSINESS.partsWarrantyMonths} months on parts, minimum
              </h2>
              <p style={{ color: 'var(--steel-300)', maxWidth: '46ch' }}>
                Every part we fit is genuine and carries at least a{' '}
                {BUSINESS.partsWarrantyMonths}-month warranty, written on your job in black
                and white. If something we fitted fails inside that window, bring the car
                straight back.
              </p>
              <ul className="ticklist">
                <li>Certified, time-served mechanics</li>
                <li>Proper diagnostic equipment, not guesswork</li>
                <li>Written quote before any work begins</li>
                <li>Same-day service where we can manage it</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------- Portal pitch ---------------- */}
        <section className="container section">
          <div className="grid cols-2" style={{ alignItems: 'center' }}>
            <div className="reveal">
              <p className="eyebrow">Your account</p>
              <h2>Track your repair online</h2>
              <p className="muted">
                Every job gets a reference and a repair log. You see the status change as the
                mechanic works, approve quotes before anything is fixed, and keep the full
                history of every car you own in one place.
              </p>
              <ul className="ticklist">
                <li>Book in about a minute, and cancel free until work starts</li>
                <li>Itemised quotes in {BUSINESS.currency} — nothing happens until you approve</li>
                <li>Live job status and a timestamped repair log</li>
                <li>Every vehicle&apos;s full service history, kept for you</li>
              </ul>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <Link href={bookHref} className="btn">Book a service</Link>
                <Link href={portalHref} className="btn btn--ghost">{portalLabel}</Link>
              </div>
            </div>

            <div className="reveal mockup" aria-hidden>
              <div className="mockup__bar"><span /><span /><span /></div>
              <div className="mockup__body">
                <div className="mockup__row">
                  <strong>Engine Diagnostics &amp; Repair</strong>
                  <span className="pill pill--info">In progress</span>
                </div>
                <p className="small muted" style={{ margin: 0 }}>DN-2609-4KQ2E · Toyota Aqua · CAB-1234</p>
                <div className="progress__rail" style={{ margin: '1rem 0' }}>
                  <div className="progress__fill" style={{ width: '68%' }} />
                </div>
                <ol className="timeline">
                  <li className="timeline__item"><div className="timeline__dot" /><div><strong className="small">Booking requested</strong></div></li>
                  <li className="timeline__item"><div className="timeline__dot" /><div><strong className="small">Assigned to a mechanic</strong></div></li>
                  <li className="timeline__item" data-latest="true"><div className="timeline__dot" /><div><strong className="small">Fault traced — quote sent</strong></div></li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- CTA band ---------------- */}
        <section className="cta">
          <div className="container center">
            <h2 style={{ color: '#fff' }}>Book your vehicle in</h2>
            <p style={{ color: 'var(--steel-300)', maxWidth: '52ch', margin: '0 auto 2rem' }}>
              Choose a service and a time that suits you. We&apos;ll inspect the vehicle and
              quote you in writing before any work begins.
            </p>
            <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={bookHref} className="btn btn--lg">Book a service</Link>
              <Link href="/contact" className="btn btn--ghost btn--lg btn--onDark">
                Contact the workshop
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <DnAssist signedIn={Boolean(session)} />
    </>
  );
}
