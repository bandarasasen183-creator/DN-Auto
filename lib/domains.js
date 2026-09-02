/**
 * The workshop's registered domain, and the subdomain map for the three
 * portals.
 *
 * The middleware reads SUBDOMAIN_PORTALS to send a visitor arriving at, say,
 * workers.dnauto.org straight into the worker portal. Adding a host is one
 * line here — no routing changes.
 */

/** Registered with Spaceship. Override per environment if you ever move. */
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'dnauto.org';

/** Absolute base URL, used for canonical links, sitemap and OpenGraph. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${ROOT_DOMAIN}`;

/** Subdomain label -> portal route. */
export const SUBDOMAIN_PORTALS = {
  customer: '/portal',
  customers: '/portal',
  worker: '/worker',
  workers: '/worker',
  admin: '/admin',
};

/** The canonical host each portal should be linked as, once DNS is set up. */
export function portalHost(portal, rootDomain = ROOT_DOMAIN) {
  const label = { '/portal': 'customer', '/worker': 'workers', '/admin': 'admin' }[portal];
  return label ? `${label}.${rootDomain}` : rootDomain;
}

/** Returns the portal a host belongs to, or null for the main site. */
export function portalForHost(host) {
  if (!host) return null;
  const label = host.split(':')[0].split('.')[0].toLowerCase();
  return SUBDOMAIN_PORTALS[label] ?? null;
}
