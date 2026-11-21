"use client";

import Link from "next/link";
import { signInWithGoogle } from "@/lib/auth";
import { useIsSignedIn } from "@/lib/useIsSignedIn";

const CLASS =
  "inline-flex min-h-11 items-center px-1.5 font-display text-base font-medium text-paper [text-shadow:0_2px_0_var(--shade)] hover:underline decoration-2 underline-offset-[5px]";

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
