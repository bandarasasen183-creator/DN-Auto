import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, ROLE_HOME } from '@/lib/auth/session';
import { BUSINESS, HOURS, PROMISES, PROCESS, SERVICE_ICONS } from '@/lib/business';
import Reveal from '@/components/Reveal';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import DnAssist from '@/components/assistant/DnAssist';
import AnnouncementBar from '@/components/AnnouncementBar';
import Icon from '@/components/Icon';
import Stars from '@/components/Stars';

export default async function HomePage() {
  const supabase = createClient();
  const [{ data: services }, { data: reviews }, session] = await Promise.all([
    supabase
      .from('services')
      .select('id, slug, name, description, category, duration_minutes')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('reviews')
      .select('id, rating, body, reply, created_at, author:profiles!reviews_author_id_fkey(full_name)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(6),
    getSessionUser(),
  ]);

  const published = reviews ?? [];
  const averageRating = published.length
    ? (published.reduce((sum, r) => sum + r.rating, 0) / published.length).toFixed(1)
    : null;

  const portalHref = session ? ROLE_HOME[session.profile.role] : '/login';
  const portalLabel = session ? 'My portal' : 'Sign in';
  const bookHref = session ? '/portal/book' : '/signup';

  const yearsTrading = new Date().getFullYear() - BUSINESS.established;

  return (
    <>
      <Reveal />
      <AnnouncementBar />
      <SiteHeader portalHref={portalHref} portalLabel={portalLabel} />

      {/* ---------------- Hero ---------------- */}
      <section className="hero">
        <div className="container hero__inner hero__inner--split">
          <div>
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

          <figure className="hero__art rise rise-2">
            <img src="/images/workshop.svg" alt="A vehicle raised on a workshop lift under an inspection lamp" width="800" height="560" />
          </figure>
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
                <span className="promise__icon" aria-hidden><Icon name={p.icon} size={22} /></span>
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
                  <span className="servicecard__icon" aria-hidden>
                    <Icon name={SERVICE_ICONS[s.slug] ?? 'wrench'} size={22} />
                  </span>
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
                Appointments are booked online for Sundays. Weekday evenings are emergency
                repairs for existing customers, arranged by phone with the workshop.
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

        {/* ---------------- Inside the workshop ---------------- */}
        <section className="band">
          <div className="container section">
            <p className="eyebrow reveal">Inside the workshop</p>
            <h2 className="reveal">Equipment that finds the fault</h2>
            <div className="gallery" style={{ marginTop: '2rem' }}>
              <figure className="gallery__item reveal">
                <img src="/images/diagnostics.svg" alt="Diagnostic equipment reading live engine data" width="600" height="420" />
                <figcaption>Live engine data, read properly before a part is ordered.</figcaption>
              </figure>
              <figure className="gallery__item reveal">
                <img src="/images/parts.svg" alt="Genuine parts and workshop tools" width="600" height="420" />
                <figcaption>Genuine parts, warrantied and recorded on your quote.</figcaption>
              </figure>
              <figure className="gallery__item reveal">
                <img src="/images/bay.svg" alt="A service bay in the workshop" width="600" height="420" />
                <figcaption>Bays booked by appointment, so your car is worked on, not parked.</figcaption>
              </figure>
            </div>
            <p className="small muted reveal" style={{ marginTop: '1rem' }}>
              Replace these with photographs of the workshop by dropping files into
              <code> public/images/</code>.
            </p>
          </div>
        </section>

        {/* ---------------- Reviews ---------------- */}
        {published.length > 0 && (
          <section className="container section">
            <div className="section__head reveal">
              <div>
                <p className="eyebrow">Customers</p>
                <h2>What people say</h2>
              </div>
              {averageRating && (
                <div className="ratingbox">
                  <strong>{averageRating}</strong>
                  <Stars value={Math.round(averageRating)} />
                  <span className="small muted">{published.length} review{published.length === 1 ? '' : 's'}</span>
                </div>
              )}
            </div>

            <div className="grid cols-3" style={{ marginTop: '2rem' }}>
              {published.map((r) => (
                <blockquote key={r.id} className="quote card reveal">
                  <Stars value={r.rating} />
                  {r.body && <p>{r.body}</p>}
                  <footer className="small muted">
                    {r.author?.full_name ?? 'A customer'} ·{' '}
                    {new Date(r.created_at).toLocaleDateString('en-LK', { month: 'long', year: 'numeric' })}
                  </footer>
                  {r.reply && (
                    <p className="quote__reply small">
                      <strong>DN Auto:</strong> {r.reply}
                    </p>
                  )}
                </blockquote>
              ))}
            </div>
          </section>
        )}

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
