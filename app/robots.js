import { SITE_URL } from '@/lib/domains';

/**
 * The portals are behind auth and have nothing to offer a crawler, so they're
 * disallowed outright rather than left to waste crawl budget.
 */
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/portal/', '/worker/', '/admin/', '/api/', '/auth/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
