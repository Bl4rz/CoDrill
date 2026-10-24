"use client";

import type { ReactNode } from "react";
import { PixelLink } from "@/components/pixel/PixelButton";
import { useIsSignedIn } from "@/lib/useIsSignedIn";

/** PRESS START. Signed-in players go to their Hub; everyone else goes straight to the posting screen. */
export function StartLink({ children, size }: { children: ReactNode; size?: "sm" | "md" | "lg" }) {
  const signedIn = useIsSignedIn();
  return (
    <PixelLink href={signedIn ? "/hub" : "/start"} size={size}>
      {children}
    </PixelLink>
  );
}
