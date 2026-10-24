"use client";

import Link from "next/link";
import { signInWithGoogle } from "@/lib/auth";
import { useIsSignedIn } from "@/lib/useIsSignedIn";

const CLASS =
  "font-display text-sm uppercase tracking-widest text-paper underline decoration-[3px] underline-offset-4 hover:text-amber";

/** HUD link: "Sign in" for visitors, "Hub" for signed-in players. Renders nothing until we know. */
export function HudSignIn({ className = "" }: { className?: string }) {
  const signedIn = useIsSignedIn();
  if (signedIn === null) return null;
  if (signedIn) {
    return (
      <Link href="/hub" className={`${CLASS} ${className}`}>
        Hub
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => signInWithGoogle()} className={`${CLASS} ${className}`}>
      Sign in
    </button>
  );
}
