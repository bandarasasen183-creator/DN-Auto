'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BUSINESS } from '@/lib/business';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

/** Public site header. Sticky, condenses on scroll, drawer nav on mobile. */
export default function SiteHeader({ portalHref, portalLabel }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sitehead" data-scrolled={scrolled}>
      <div className="container sitehead__inner">
        <Link href="/" className="sitehead__brand">
          <span aria-hidden className="sitehead__mark">DN</span>
          <span>
            <strong>{BUSINESS.shortName.toUpperCase()}</strong>
            <span className="sitehead__tag">Repairs &amp; Imports</span>
          </span>
        </Link>

        <nav className="sitehead__nav" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="sitehead__link"
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sitehead__actions">
          <Link href={portalHref} className="btn btn--ghost sitehead__signin">
            {portalLabel}
          </Link>
          <Link href="/signup" className="btn">Book a service</Link>
          <button
            type="button"
            className="sitehead__burger"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Menu"
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {open && (
        <div className="sitehead__drawer">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="sitehead__drawerlink">
              {item.label}
            </Link>
          ))}
          <Link href={portalHref} className="sitehead__drawerlink">{portalLabel}</Link>
        </div>
      )}
    </header>
  );
}
