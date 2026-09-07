import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client that bypasses row-level security.
 *
 * For machine-to-machine work only — an inbound webhook has no signed-in
 * user, so there is no session for RLS to run as. Everything else in the
 * app must keep using `server.js`, which runs as the logged-in user and
 * is what makes a customer unable to read another customer's rows.
 *
 * The service role key is never exposed to the browser. Importing this
 * file from a Client Component would leak it, so it is only ever used
 * from route handlers.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Inbound email cannot be stored ' +
        'without it — add it to the environment (server-side only).'
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
