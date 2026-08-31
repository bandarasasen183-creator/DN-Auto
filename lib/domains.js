/**
 * Subdomain map for the three portals.
 *
 * The middleware reads this to send a visitor arriving at, say,
 * workers.dnauto.lk straight into the worker portal. Adding a domain is one
 * line here — no routing changes.
 */

/** Subdomain label -> portal route. */
export const SUBDOMAIN_PORTALS = {
  customer: '/portal',
  customers: '/portal',
  worker: '/worker',
  workers: '/worker',
  admin: '/admin',
};

/** The canonical host each portal should be linked as, once DNS is set up. */
export function portalHost(portal, rootDomain) {
  const label = { '/portal': 'customer', '/worker': 'workers', '/admin': 'admin' }[portal];
  return label ? `${label}.${rootDomain}` : rootDomain;
}

/** Returns the portal a host belongs to, or null for the main site. */
export function portalForHost(host) {
  if (!host) return null;
  const label = host.split(':')[0].split('.')[0].toLowerCase();
  return SUBDOMAIN_PORTALS[label] ?? null;
}
