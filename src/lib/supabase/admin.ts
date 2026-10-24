import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses Row Level Security entirely. The only thing
 * that uses it is the daily usage counter (src/lib/usage.ts), which has to
 * work for signed-out visitors and must not be callable from the browser.
 * Never import it into anything that reads or writes a user's own data; use
 * the regular server/browser clients for that so RLS stays the real boundary.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
