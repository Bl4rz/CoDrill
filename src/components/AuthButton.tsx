"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PixelButton, PixelLink } from "@/components/pixel/PixelButton";
import type { User } from "@supabase/supabase-js";

/**
 * Sign-in is optional. Sessions run fine signed out (they live in this
 * browser); signing in with Google just keeps your history across devices.
 * Renders nothing if Supabase isn't configured, so a missing env var can
 * never break the page around it.
 */
export function AuthButton() {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (!supabase) return null;

  async function signInWithGoogle() {
    await supabase!.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function signOut() {
    await supabase!.auth.signOut();
  }

  if (!ready) {
    return <div className="h-9 w-20" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <PixelLink href="/hub" variant="ghost" size="sm">
          Hub
        </PixelLink>
        <PixelLink href="/profile" variant="ghost" size="sm">
          Profile
        </PixelLink>
        <PixelButton variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </PixelButton>
      </div>
    );
  }

  return (
    <PixelButton
      variant="ghost"
      size="sm"
      onClick={signInWithGoogle}
      aria-label="Sign in with Google"
      title="Optional: sign in with Google to keep your history across devices"
    >
      Sign in
    </PixelButton>
  );
}
