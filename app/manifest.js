import { BUSINESS } from '@/lib/business';

/**
 * Installed to the home screen of the workshop tablets.
 *
 * `display: standalone` drops Chrome's address bar, which matters on a 10.1"
 * screen — it is roughly 8% of the height back, and it stops a mechanic
 * wandering off to another site mid-job. `start_url` opens billing directly:
 * the tablets exist to take payments.
 */
export default function manifest() {
  return {
    name: `${BUSINESS.name} — Workshop`,
    short_name: BUSINESS.shortName,
    description: 'Raise a bill and take payment at the counter.',
    start_url: '/worker/billing',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0b0e13',
    theme_color: '#0b0e13',
    lang: 'en-LK',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'New bill', url: '/worker/billing/new' },
      { name: 'My jobs', url: '/worker/jobs' },
    ],
  };
}
