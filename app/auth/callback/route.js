import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ROLE_HOME } from '@/lib/auth/session';

/**
 * Where Supabase sends people after they confirm an email or reset a password.
 * Exchanges the code for a session, then drops them in their own portal.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=bad-code`);
  }

  // Only ever redirect to our own paths — an open redirect here would be a
  // free phishing landing page on the workshop's own domain.
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  return NextResponse.redirect(`${origin}${ROLE_HOME[profile?.role] ?? '/'}`);
}
