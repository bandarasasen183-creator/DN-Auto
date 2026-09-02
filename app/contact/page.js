import Link from 'next/link';
import { getSessionUser, ROLE_HOME } from '@/lib/auth/session';
import { BUSINESS, HOURS } from '@/lib/business';
import Reveal from '@/components/Reveal';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import DnAssist from '@/components/assistant/DnAssist';

export const metadata = {
  title: 'Contact & directions',
  description:
    'Find DN Auto Repairs And Imports on Church Rd, Kadawatha. Opening hours, directions and how to reach the workshop.',
};

/** True while a placeholder is still in lib/business.js. */
const isPlaceholder = (value) => !value || value.includes('X');

export default async function ContactPage() {
  const session = await getSessionUser();
  const portalHref = session ? ROLE_HOME[session.profile.role] : '/login';
  const bookHref = session ? '/portal/book' : '/signup';
  const { contact, address } = BUSINESS;

  return (
    <>
      <Reveal />
      <SiteHeader portalHref={portalHref} portalLabel={session ? 'My portal' : 'Sign in'} />

      <section className="pagehead">
        <div className="container">
          <p className="hero__eyebrow rise">Contact</p>
          <h1 className="rise rise-1">Come and see us</h1>
          <p className="hero__lead rise rise-2">
            We&apos;re on Church Rd in {address.city}. Sunday is our service day — book a slot
            online and we&apos;ll have a mechanic ready for you.
          </p>
        </div>
      </section>

      <main>
        <section className="container section grid cols-2" style={{ alignItems: 'start' }}>
          <div className="stack reveal" style={{ '--gap': '1.5rem' }}>
            <div className="card">
              <h3>The workshop</h3>
              <address className="muted" style={{ fontStyle: 'normal', marginBottom: '1rem' }}>
                {BUSINESS.name}<br />
                {address.line1}<br />
                {address.city} {address.postcode}<br />
                {address.district} District, {address.province}<br />
                {address.country}
              </address>
              <a className="btn" href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">
                Get directions
              </a>
            </div>

            <div className="card">
              <h3>Get in touch</h3>
              {isPlaceholder(contact.phone) ? (
                <p className="form-note" style={{ marginBottom: '1rem' }}>
                  Phone and email aren&apos;t published here yet. Book online and we&apos;ll
                  call you — or add the real numbers in <code>lib/business.js</code>.
                </p>
              ) : (
                <ul className="contactlist">
                  <li>
                    <span className="small muted">Phone</span>
                    <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a>
                  </li>
                  {!isPlaceholder(contact.whatsapp) && (
                    <li>
                      <span className="small muted">WhatsApp</span>
                      <a
                        href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {contact.whatsapp}
                      </a>
                    </li>
                  )}
                  <li>
                    <span className="small muted">Email</span>
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </li>
                </ul>
              )}
              <p className="small muted" style={{ marginBottom: 0 }}>
                The quickest way to reach us is to book online — it puts your car straight in
                the diary and you can follow the job from your account.
              </p>
            </div>

            <div className="card">
              <h3>Opening hours</h3>
              <ul className="hourlist hourlist--light">
                {Object.values(HOURS).map((h) => (
                  <li key={h.label} data-kind={h.kind}>
                    <span>{h.label}</span>
                    <span>
                      {h.kind === 'closed'
                        ? 'Closed'
                        : h.kind === 'emergency'
                          ? `${h.open}–${h.close} · emergency`
                          : `${h.open}–${h.close}`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="small muted" style={{ marginBottom: 0 }}>
                Online booking is for Sunday appointments. Weekday evenings from 6:00 PM are
                emergency repairs for existing customers — call the workshop for those, as we
                need to confirm a mechanic is free before you set off. Closed Saturdays.
              </p>
            </div>
          </div>

          <div className="reveal">
            <div className="mapframe">
              <iframe
                title={`Map to ${BUSINESS.name}`}
                src="https://www.google.com/maps?q=DN+Auto+Repair+And+Imports,+Church+Rd,+Kadawatha&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
              <h3>Booking beats calling</h3>
              <p className="muted small">
                Booking online takes about a minute, gives you a reference number, and means
                the mechanic knows what&apos;s coming before you arrive.
              </p>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <Link href={bookHref} className="btn">Book a service</Link>
                <Link href="/services" className="btn btn--ghost">Our services</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <DnAssist signedIn={Boolean(session)} />
    </>
  );
}
