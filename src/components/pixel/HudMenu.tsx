"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/pixel/icons";
import { playBlip } from "@/lib/sound";
import { signInWithGoogle } from "@/lib/auth";
import { useIsSignedIn } from "@/lib/useIsSignedIn";

export interface MenuLink {
  href?: string;
  label: string;
  /** Where this goes for signed-in players instead */
  signedInHref?: string;
  /** Run an action instead of following a link; hidden once signed in */
  action?: "signin";
}

/** Pixel hamburger: opens a cream dialog of links. Closes on Escape, outside click, or choosing a link. */
export function HudMenu({ links, className = "" }: { links: MenuLink[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const signedIn = useIsSignedIn();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="hud-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => {
          playBlip("press");
          setOpen((o) => !o);
        }}
        className="flex h-11 w-11 items-center justify-center border-[3px] border-paper bg-ink text-paper hover:border-amber hover:text-amber focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber"
      >
        {open ? <CloseIcon unit="2px" /> : <MenuIcon unit="2px" />}
      </button>
      {open && (
        <nav
          id="hud-menu"
          aria-label="Menu"
          className="px-dialog absolute right-0 top-full z-30 mt-3 flex w-56 flex-col"
        >
          {links.map((link) => {
            if (link.action === "signin") {
              if (signedIn !== false) return null;
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    signInWithGoogle();
                  }}
                  className="px-4 py-3 text-left font-display text-base uppercase tracking-widest text-ink hover:bg-ink hover:text-paper"
                >
                  {link.label}
                </button>
              );
            }
            const href = signedIn && link.signedInHref ? link.signedInHref : link.href!;
            return (
              <a
                key={link.label}
                href={href}
                onClick={() => setOpen(false)}
                className="px-4 py-3 font-display text-base uppercase tracking-widest text-ink hover:bg-ink hover:text-paper"
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      )}
    </div>
  );
}
