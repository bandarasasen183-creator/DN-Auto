import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Home route for each role — used by login and by the middleware redirects. */
export const ROLE_HOME = {
  customer: '/portal',
  worker: '/worker',
  admin: '/admin',
};

/**
 * Returns { user, profile } for the current request, or null when signed out.
 * Uses getUser() rather than getSession() so the token is verified server-side.
 */
export async function getSessionUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, email, is_active')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  return { user, profile };
}

/**
 * Guard for portal pages. Redirects to login when signed out, and to the
 * caller's own portal when they hold the wrong role.
 */
export async function requireRole(roles, { from } = {}) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const session = await getSessionUser();

  if (!session) {
    const next = from ? `?next=${encodeURIComponent(from)}` : '';
    redirect(`/login${next}`);
  }
  if (!session.profile.is_active) {
    redirect('/login?error=account-disabled');
  }
  if (!allowed.includes(session.profile.role)) {
    redirect(ROLE_HOME[session.profile.role] ?? '/');
  }
  return session;
}
