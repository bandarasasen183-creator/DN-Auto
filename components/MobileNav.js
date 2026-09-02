'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BUSINESS } from '@/lib/business';
import Icon from '@/components/Icon';

/**
 * The portal sidebar becomes a slide-in drawer below 960px, where the sidebar
 * would otherwise eat the whole first screen.
 */
export default function MobileNav({ nav, current, profile }) {
  const [open, setOpen] = useState(false);

  // Navigating should close the drawer; so should Escape.
  useEffect(() => {
    setOpen(false);
  }, [current]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className="mobilebar">
        <button
          type="button"
          className="mobilebar__toggle"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Icon name="menu" size={22} />
        </button>
        <strong style={{ letterSpacing: '0.08em' }}>{BUSINESS.shortName.toUpperCase()}</strong>
        <span className="small muted">{profile.full_name.split(' ')[0]}</span>
      </header>

      {open && (
        <div className="drawer" role="dialog" aria-label="Navigation">
          <button type="button" className="drawer__scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />
          <nav className="drawer__panel">
            <button type="button" className="drawer__close" onClick={() => setOpen(false)} aria-label="Close"><Icon name="close" size={18} /></button>
            <ul style={{ listStyle: 'none', margin: '2rem 0 0', padding: 0, display: 'grid', gap: '0.25rem' }}>
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="navlink"
                    aria-current={item.href === current ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <Icon name={item.icon} size={18} /> {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
