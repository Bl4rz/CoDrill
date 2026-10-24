"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/pixel/icons";
import { playBlip } from "@/lib/sound";

export interface MenuLink {
  href: string;
  label: string;
}

/** Pixel hamburger: opens a cream dialog of links. Closes on Escape, outside click, or choosing a link. */
export function HudMenu({ links, className = "" }: { links: MenuLink[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="px-4 py-3 font-display text-base uppercase tracking-widest text-ink hover:bg-ink hover:text-paper"
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
