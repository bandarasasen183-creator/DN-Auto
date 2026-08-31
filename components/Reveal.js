'use client';

import { useEffect } from 'react';

/**
 * Adds `.is-visible` to every `.reveal` element as it scrolls into view.
 * Renders nothing — drop it once per page that uses scroll reveals.
 */
export default function Reveal() {
  useEffect(() => {
    const targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    // Respect the OS setting rather than animating anyway.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (!entry.isIntersecting) return;
          // A small stagger stops a whole grid popping in as one block.
          entry.target.style.transitionDelay = `${Math.min(i * 60, 240)}ms`;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
