"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Sign-in is optional, not required — the free-session flow keeps working
 * unauthenticated via localStorage (see src/lib/store.ts). This only adds
 * an account on top for people who want it. Renders nothing (rather than
 * throwing) if Supabase isn't configured, since a misconfigured/missing
 * env var must never be able to break the rest of the page.
 */
export function AuthButton() {
  // Lazy initializer runs once at mount, not on every render — and since
  // it's outside an effect body, there's no synchronous-setState-in-effect
  // concern for the "unavailable" case below.
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
    return <div className="h-7 w-24" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden font-mono text-xs text-muted sm:inline">{user.email}</span>
        <Link
          href="/profile"
          className="whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-accent-green hover:text-accent-green"
        >
          Profile
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-accent-green hover:text-accent-green"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      className="whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-accent-green hover:text-accent-green"
    >
      Sign in with Google
    </button>
  );
}
