import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses Row Level Security entirely. Only for
 * trusted server-to-server contexts with no user session to scope to, like
 * the Stripe webhook: it has no cookies, no signed-in user, so the normal
 * cookie-based server client (src/lib/supabase/server.ts) has nothing to
 * authenticate as and RLS would reject the write outright. Never import
 * this into anything that handles a browser request on a user's behalf —
 * use the regular server/browser clients for that, so RLS stays the actual
 * security boundary everywhere except here.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
