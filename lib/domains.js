/**
 * The workshop's domains, and the subdomain map for the three portals.
 *
 * Two domains are registered:
 *   dnauto.lk   — the canonical site (BuyDomains.LK). A Sri Lankan workshop
 *                 belongs on a .lk: it ranks better locally and it is the one
 *                 customers in Kadawatha will trust and remember.
 *   dnauto.org  — an alias (Spaceship), held for a possible expansion beyond
 *                 Sri Lanka. Until then it redirects to the .lk so the two
 *                 never compete in search as duplicate content.
 *
 * There is one deployment and one database behind both. Promoting .org to a
 * site of its own later means moving it out of ALIAS_DOMAINS — the data,
 * accounts and portals are already shared.
 */

/** The canonical domain. Override per environment for staging. */
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'dnauto.lk';

/** Domains that redirect to the canonical one, host and subdomains alike. */
export const ALIAS_DOMAINS = (process.env.NEXT_PUBLIC_ALIAS_DOMAINS ?? 'dnauto.org')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

/** Absolute base URL, used for canonical links, sitemap and OpenGraph. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${ROOT_DOMAIN}`;

/**
 * Subdomain label -> portal route. These resolve on the canonical domain, and
 * an alias keeps its subdomain through the redirect, so admin.dnauto.org
 * lands on admin.dnauto.lk rather than the home page.
 */
export const SUBDOMAIN_PORTALS = {
  customer: '/portal',
  customers: '/portal',
  worker: '/worker',
  workers: '/worker',
  admin: '/admin',
};

/** Strips the port and lowercases, so comparisons are predictable. */
function hostname(host) {
  return (host ?? '').split(':')[0].toLowerCase();
}

/** The canonical host each portal is linked as, once DNS is set up. */
export function portalHost(portal, rootDomain = ROOT_DOMAIN) {
  const label = { '/portal': 'customer', '/worker': 'workers', '/admin': 'admin' }[portal];
  return label ? `${label}.${rootDomain}` : rootDomain;
}

/** Returns the portal a host belongs to, or null for the main site. */
export function portalForHost(host) {
  const name = hostname(host);
  if (!name) return null;
  return SUBDOMAIN_PORTALS[name.split('.')[0]] ?? null;
}

/**
 * If this host belongs to an alias domain, returns the equivalent host on the
 * canonical domain — keeping the subdomain, so admin.dnauto.org lands on
 * admin.dnauto.lk. Returns null when the host is already canonical.
 */
export function canonicalHostFor(host) {
  const name = hostname(host);
  if (!name) return null;

  const alias = ALIAS_DOMAINS.find((d) => name === d || name.endsWith(`.${d}`));
  if (!alias) return null;

  const label = name === alias ? '' : name.slice(0, -(alias.length + 1));
  return label ? `${label}.${ROOT_DOMAIN}` : ROOT_DOMAIN;
}
