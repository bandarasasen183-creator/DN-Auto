import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { portalForHost } from '@/lib/domains';

const PROTECTED = [
  { prefix: '/portal', roles: ['customer'] },
  { prefix: '/worker', roles: ['worker'] },
  { prefix: '/admin', roles: ['admin'] },
];

const ROLE_HOME = { customer: '/portal', worker: '/worker', admin: '/admin' };

export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
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
    }
  );

  // Refreshing here keeps the auth cookie alive for Server Components.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // --- Subdomain -> portal rewrite -----------------------------------
  const portal = portalForHost(request.headers.get('host'));
  if (portal && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = portal;
    return NextResponse.redirect(url);
  }

  // --- Route protection ----------------------------------------------
  const rule = PROTECTED.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );

  if (rule) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile?.is_active) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '?error=account-disabled';
      return NextResponse.redirect(url);
    }

    if (!rule.roles.includes(profile.role)) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_HOME[profile.role] ?? '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // A signed-in user has no reason to sit on the login page.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[profile?.role] ?? '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)'],
};
