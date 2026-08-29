import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components. Create a fresh instance per
 * call rather than a module-level singleton — this is the pattern Supabase's
 * SSR package expects, since it needs to run in both server and browser
 * contexts without leaking state between requests.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
