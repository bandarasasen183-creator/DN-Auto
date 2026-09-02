import Link from 'next/link';
import { getSessionUser, ROLE_HOME } from '@/lib/auth/session';
import { BUSINESS, PROMISES } from '@/lib/business';
import Icon from '@/components/Icon';
import Reveal from '@/components/Reveal';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import DnAssist from '@/components/assistant/DnAssist';

export const metadata = {
  title: 'About the workshop',
  description:
    'DN Auto Repairs And Imports has been repairing petrol vehicles on Church Rd, Kadawatha since 2019.',
};

export default async function AboutPage() {
  const session = await getSessionUser();
  const portalHref = session ? ROLE_HOME[session.profile.role] : '/login';
  const years = new Date().getFullYear() - BUSINESS.established;

  return (
    <>
      <Reveal />
      <SiteHeader portalHref={portalHref} portalLabel={session ? 'My portal' : 'Sign in'} />

      <section className="pagehead">
        <div className="container">
          <p className="hero__eyebrow rise">About</p>
          <h1 className="rise rise-1">Fixing cars in Kadawatha since 2019</h1>
          <p className="hero__lead rise rise-2">
            {BUSINESS.name} has been on Church Rd in {BUSINESS.address.city} since{' '}
            {BUSINESS.established} — {years} years of fixing petrol vehicles for people who
            live and work around here.
          </p>
        </div>
      </section>

      <main>
        <section className="container section grid cols-2">
          <div className="reveal">
            <p className="eyebrow">Our approach</p>
            <h2>Diagnose before replacing</h2>
            <p className="muted">
              Plenty of workshops will swap parts until the noise goes away and hand you the
              bill. We&apos;d rather spend the first hour finding out what&apos;s actually
              wrong. It&apos;s slower to start with and cheaper by the end.
            </p>
            <p className="muted">
              That means real diagnostic equipment, live data off the engine, and a mechanic
              who can read it. If we can&apos;t find the fault, we&apos;ll say so rather than
              guessing with your money.
            </p>
          </div>

          <div className="reveal">
            <p className="eyebrow">Our scope</p>
            <h2>Petrol vehicles only</h2>
            <p className="muted">
              Petrol and hybrid-petrol vehicle repair, and we keep to it. Diesel vehicles,
              air-conditioning, wheel alignment, balancing and tyre fitting all require a
              differently equipped workshop, so we refer that work elsewhere rather than do
              it half well.
            </p>
            <p className="muted">
              Staying inside our scope is why the work we do take on is done properly.
            </p>
          </div>
        </section>

        <section className="band">
          <div className="container section">
            <p className="eyebrow reveal">How we work</p>
            <h2 className="reveal">Our standards</h2>
            <div className="grid cols-4" style={{ marginTop: '2rem' }}>
              {PROMISES.map((p) => (
                <article key={p.title} className="card card--hover reveal">
                  <span className="promise__icon" aria-hidden><Icon name={p.icon} size={22} /></span>
                  <h3>{p.title}</h3>
                  <p className="small muted" style={{ margin: 0 }}>{p.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container section">
          <div className="grid cols-2" style={{ alignItems: 'center' }}>
            <div className="reveal">
              <p className="eyebrow">Since {BUSINESS.established}</p>
              <h2>Why we work this way</h2>
              <p className="muted">
                Most of what frustrates people about a workshop isn&apos;t the repair — it&apos;s
                not knowing. Not knowing what it&apos;ll cost, whether it&apos;s started,
                whether the part arrived, what was actually done.
              </p>
              <p className="muted">
                So every job here gets a reference, an itemised quote you approve before work
                begins, and a repair log that updates as the mechanic works. You can check it
                from your phone instead of ringing us.
              </p>
              <Link href="/signup" className="btn">Create an account</Link>
            </div>

            <div className="reveal card">
              <h3>Where to find us</h3>
              <address className="muted" style={{ fontStyle: 'normal' }}>
                {BUSINESS.address.line1}<br />
                {BUSINESS.address.city} {BUSINESS.address.postcode}<br />
                {BUSINESS.address.district} District<br />
                {BUSINESS.address.province}, {BUSINESS.address.country}
              </address>
              <a className="btn btn--ghost" href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">
                Open in Google Maps
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <DnAssist signedIn={Boolean(session)} />
    </>
  );
}
