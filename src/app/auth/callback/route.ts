import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (err) {
      // Covers a misconfigured/missing Supabase env var too — better to
      // land on the friendly error page than 500 mid-OAuth-flow.
      console.error("Auth callback failed:", err);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
