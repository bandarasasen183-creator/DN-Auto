import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { portalForHost, canonicalHostFor } from '@/lib/domains';

const PROTECTED = [
  { prefix: '/portal', roles: ['customer'] },
  { prefix: '/worker', roles: ['worker'] },
  { prefix: '/admin', roles: ['admin'] },
];

const ROLE_HOME = { customer: '/portal', worker: '/worker', admin: '/admin' };

/** Builds a redirect on the current host, keeping protocol and port. */
function redirectTo(request, pathname, search = '') {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.redirect(url);
}

export async function middleware(request) {
  // An alias domain redirects before anything else — no session work, no
  // database call, and a 308 so search engines fold it into the canonical
  // domain instead of ranking both.
  const host = request.headers.get('host');
  const canonical = canonicalHostFor(host);
  if (canonical) {
    const url = request.nextUrl.clone();
    url.host = canonical;
    url.port = '';
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  let response = NextResponse.next({ request });
  const { pathname, search } = request.nextUrl;

  // -------------------------------------------------------------------
  // Everything below talks to Supabase, and middleware runs on *every*
  // request. So a failure here — a missing environment variable, a
  // malformed key, Supabase being down — would otherwise take the public
  // marketing site down with it, which is the worst possible trade: the
  // pages that need no session at all stop working because sessions are
  // broken.
  //
  // Instead: if the session cannot be read, public pages carry on as if
  // signed out, and the guarded portals send people to /login rather than
  // letting them through. Degraded, never open, and never a 500 on the
  // home page.
  // -------------------------------------------------------------------
  const protectedRule = PROTECTED.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Nothing to authenticate against. Say so in the logs — this is a
    // deployment mistake, and it should be obvious rather than mysterious.
    console.error(
      '[middleware] Supabase environment variables are missing. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
    return protectedRule ? redirectTo(request, '/login', '?error=unavailable') : response;
  }

  let supabase;
  let user = null;

  try {
    supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // Refreshing here keeps the auth cookie alive for Server Components.
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch (error) {
    console.error('[middleware] Could not read the session:', error?.message ?? error);
    return protectedRule ? redirectTo(request, '/login', '?error=unavailable') : response;
  }

  // --- Subdomain -> portal rewrite -----------------------------------
  const portal = portalForHost(host);
  if (portal && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = portal;
    return NextResponse.redirect(url);
  }

  // --- Route protection ----------------------------------------------
  const rule = protectedRule;

  if (rule) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }

    let profile = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();
      profile = data;
    } catch (error) {
      // Cannot establish who this is, so cannot let them into a portal.
      // Failing closed is the only safe direction here.
      console.error('[middleware] Could not read the profile:', error?.message ?? error);
      return redirectTo(request, '/login', '?error=unavailable');
    }

    if (!profile?.is_active) {
      return redirectTo(request, '/login', '?error=account-disabled');
    }

    if (!rule.roles.includes(profile.role)) {
      return redirectTo(request, ROLE_HOME[profile.role] ?? '/');
    }
  }

  // A signed-in user has no reason to sit on the login page. This one is a
  // convenience, so a failure just leaves them on the page they asked for
  // rather than turning a cosmetic redirect into an error.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      return redirectTo(request, ROLE_HOME[profile?.role] ?? '/');
    } catch {
      return response;
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)'],
};
