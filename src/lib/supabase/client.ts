import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for use in Client Components. Create a fresh instance per
 * call rather than a module-level singleton — this is the pattern Supabase's
 * SSR package expects, since it needs to run in both server and browser
 * contexts without leaking state between requests.
 *
 * Returns null instead of throwing when the env vars are missing —
 * createBrowserClient throws synchronously otherwise, and an uncaught throw
 * here (e.g. from a misconfigured Vercel deploy) took down hydration for the
 * entire page in production, not just the sign-in button. Callers must
 * handle null by treating auth as unavailable.
 */
export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("Supabase env vars missing on the client — sign-in is unavailable.");
    return null;
  }

  return createBrowserClient(url, anonKey);
}
