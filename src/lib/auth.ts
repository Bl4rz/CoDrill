"use client";

import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogle() {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
}
