/* eslint-disable no-restricted-globals */
/**
 * Offline support for the workshop tablets.
 *
 * The workshop's Wi-Fi drops. When it does, a mechanic holding a tablet
 * should still be able to see what is in the shop and get on with the
 * job, rather than staring at a dinosaur.
 *
 * The trick that keeps this small: the app is server-rendered, so the
 * cached HTML of a page IS the offline copy of its data. There is no
 * second database on the tablet to fall out of step with the real one —
 * offline you see the last version of a page you actually visited, which
 * is honest and needs no sync logic at all.
 *
 * Writes are a different matter and are handled in lib/offline/queue.js.
 */

const VERSION = 'v1';
const SHELL = `dn-shell-${VERSION}`;
const PAGES = `dn-pages-${VERSION}`;
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icon-192.png']))
      // A failure here must not stop the worker installing — offline
      // support is better partial than absent.
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('dn-') && !key.endsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Next.js build assets are content-hashed, so they never go stale. */
function isImmutable(url) {
  return url.pathname.startsWith('/_next/static/');
}

/** Pages worth having offline. Deliberately not the whole app. */
function isCacheablePage(url) {
  return (
    url.pathname === '/worker' ||
    url.pathname.startsWith('/worker/tickets') ||
    url.pathname.startsWith('/worker/jobs') ||
    url.pathname === '/worker/billing'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GETs are ever served from cache. A POST is somebody doing
  // something, and replaying it from a cache would be a bug with real
  // consequences — those go through the sync queue instead.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache anything that talks to Supabase or our own API. Stale
  // auth or stale money is worse than an error.
  if (url.pathname.startsWith('/api/')) return;

  if (isImmutable(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  if (request.mode !== 'navigate') return;

  // Network first: online, you always get the truth. The cache is only
  // ever a fallback, so nobody is quietly reading yesterday's board.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && isCacheablePage(url)) {
          const copy = response.clone();
          caches.open(PAGES).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return (await caches.match(OFFLINE_URL)) ?? Response.error();
      })
  );
});

/**
 * The page asks for a flush when it regains a connection. The worker
 * simply tells every open tab to do it, because the queue lives in the
 * page where the session cookie is.
 */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FLUSH_QUEUE') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'FLUSH_QUEUE' }));
    });
  }
});
