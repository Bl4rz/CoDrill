import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session cookie on every request. Called from
 * `src/proxy.ts` (Next 16 renamed `middleware.ts` to `proxy.ts` — same
 * mechanism, new file/export name). Without this, access tokens expire and
 * Server Components silently see a stale/logged-out session.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // This runs on nearly every request (see the matcher in src/proxy.ts), so
  // a missing/misconfigured env var here must degrade to "no auth" rather
  // than throwing — throwing here 500s the entire site, not just sign-in.
  if (!url || !anonKey) {
    console.error(
      "Supabase env vars missing — skipping session refresh. Sign-in will not work until " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touching auth.getUser() is what actually triggers a token refresh when
  // needed — do not remove this even though the result isn't used directly.
  await supabase.auth.getUser();

  return supabaseResponse;
}
