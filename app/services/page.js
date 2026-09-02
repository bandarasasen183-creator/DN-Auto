import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, ROLE_HOME } from '@/lib/auth/session';
import { BUSINESS } from '@/lib/business';
import Reveal from '@/components/Reveal';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import DnAssist from '@/components/assistant/DnAssist';

export const metadata = {
  title: 'Services',
  description:
    'Engine diagnostics, servicing, brakes, electrical and transmission work for petrol vehicles in Kadawatha.',
};

export default async function ServicesPage() {
  const supabase = createClient();
  const [{ data: services }, session] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, description, category, duration_minutes')
      .eq('is_active', true)
      .order('sort_order'),
    getSessionUser(),
  ]);

  const portalHref = session ? ROLE_HOME[session.profile.role] : '/login';
  const bookHref = session ? '/portal/book' : '/signup';

  // Group by category so the page reads like a menu rather than a list.
  const grouped = (services ?? []).reduce((acc, s) => {
    const key = s.category ?? 'Other';
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <>
      <Reveal />
      <SiteHeader portalHref={portalHref} portalLabel={session ? 'My portal' : 'Sign in'} />

      <section className="pagehead">
        <div className="container">
          <p className="hero__eyebrow rise">Services</p>
          <h1 className="rise rise-1">What we fix</h1>
          <p className="hero__lead rise rise-2">
            Every job gets a written, itemised quote once a mechanic has actually seen the
            vehicle — and nothing is touched until you approve it.
          </p>
        </div>
      </section>

      <main>
        <section className="container section">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={{ marginBottom: '3rem' }}>
              <h2 className="reveal">{category}</h2>
              <div className="grid cols-2" style={{ marginTop: '1.25rem' }}>
                {items.map((s) => (
                  <article key={s.id} className="card card--hover reveal servicecard">
                    <h3>{s.name}</h3>
                    <p className="small muted">{s.description}</p>
                    <div className="servicecard__foot">
                      <span className="small muted">Usually about {s.duration_minutes} minutes</span>
                    </div>
                    <Link href={bookHref} className="servicecard__cta">Book this service →</Link>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="band">
          <div className="container section grid cols-2">
            <div className="reveal">
              <p className="eyebrow">Our warranty</p>
              <h2>{BUSINESS.partsWarrantyMonths} months on parts, minimum</h2>
              <p className="muted">
                Every part we fit carries at least a {BUSINESS.partsWarrantyMonths}-month
                warranty, and it&apos;s written on your quote line by line — not buried in
                terms you never see. If a part we fitted fails inside that window, bring the
                car back.
              </p>
              <p className="muted small">
                Genuine parts only. If a genuine part isn&apos;t available for your vehicle
                we&apos;ll tell you before ordering anything, not after.
              </p>
            </div>

            <div className="reveal">
              <p className="eyebrow">Please note</p>
              <h2>Petrol vehicles only</h2>
              <p className="muted">
                We are a repair workshop for petrol and hybrid-petrol vehicles. We do not
                take on diesel vehicles, air-conditioning work, wheel alignment, wheel
                balancing or tyre fitting — those need a differently equipped workshop.
              </p>
              <p className="muted small">
                If you are unsure whether your vehicle is something we can help with, contact
                us before booking and we will tell you honestly.
              </p>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="container center">
            <h2 style={{ color: '#fff' }}>Not sure which service you need?</h2>
            <p style={{ color: 'var(--steel-300)', maxWidth: '52ch', margin: '0 auto 2rem' }}>
              Describe the problem when you book and we will identify the right work once we
              have inspected the vehicle.
            </p>
            <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={bookHref} className="btn btn--lg">Book a service</Link>
              <Link href="/contact" className="btn btn--ghost btn--lg btn--onDark">Ask us first</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <DnAssist signedIn={Boolean(session)} />
    </>
  );
}
