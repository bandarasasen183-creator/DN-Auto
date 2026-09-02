import Link from 'next/link';
import { BUSINESS, HOURS } from '@/lib/business';

export default function SiteFooter() {
  const { address, contact } = BUSINESS;

  return (
    <footer className="sitefoot">
      <div className="container sitefoot__grid">
        <div>
          <Link href="/" className="sitehead__brand" style={{ color: '#fff' }}>
            <span aria-hidden className="sitehead__mark">DN</span>
            <strong>{BUSINESS.shortName.toUpperCase()}</strong>
          </Link>
          <p className="small" style={{ color: 'var(--steel-400)', maxWidth: '34ch' }}>
            Petrol-vehicle repairs in Kadawatha since {BUSINESS.established}. Certified
            mechanics, genuine parts, {BUSINESS.partsWarrantyMonths}-month parts warranty.
          </p>
        </div>

        <div>
          <h4 className="sitefoot__h">Visit</h4>
          <address className="small" style={{ fontStyle: 'normal', color: 'var(--steel-400)' }}>
            {address.line1}<br />
            {address.city} {address.postcode}<br />
            {address.district} District, {address.country}
          </address>
          <a className="small sitefoot__link" href={BUSINESS.mapsUrl} target="_blank" rel="noreferrer">
            Open in Google Maps →
          </a>
        </div>

        <div>
          <h4 className="sitefoot__h">Hours</h4>
          <ul className="sitefoot__hours small">
            {Object.values(HOURS).map((h) => (
              <li key={h.label}>
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
        </div>

        <div>
          <h4 className="sitefoot__h">Pages</h4>
          <ul className="sitefoot__links small">
            <li><Link href="/services">Our services</Link></li>
            <li><Link href="/about">About the workshop</Link></li>
            <li><Link href="/contact">Contact &amp; directions</Link></li>
            <li><Link href="/signup">Create an account</Link></li>
            <li><Link href="/login">Sign in</Link></li>
          </ul>
        </div>
      </div>

      <div className="container sitefoot__base small">
        <span>© {new Date().getFullYear()} {BUSINESS.name}</span>
        <span className="sitefoot__scope">
          Petrol vehicle repairs · {BUSINESS.address.city}
        </span>
      </div>
    </footer>
  );
}
