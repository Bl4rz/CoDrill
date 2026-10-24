"use client";

import { useEffect, useRef } from "react";
import { Mascot } from "@/components/pixel/Mascot";
import { PixelButton } from "@/components/pixel/PixelButton";
import { playBlip } from "@/lib/sound";

/**
 * The LEVEL UP! moment: a cream dialog with the mascot. Skippable (Continue,
 * Escape). Nothing in it moves except the mascot's idle hop, which the global
 * reduced-motion rule switches off.
 */
export function LevelUpDialog({
  level,
  previousLevel,
  xpEarned,
  onClose,
}: {
  level: number;
  previousLevel: number;
  xpEarned?: number;
  onClose: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    playBlip("grade");
    buttonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink p-6"
    >
      <div className="px-dialog flex w-full max-w-md flex-col items-center gap-5 p-8 text-center">
        <div className="mascot-idle">
          <Mascot expression="impressed" scale={1.5} />
        </div>
        <h2 id="levelup-title" className="pixel-title text-[clamp(1.5rem,7vw,2.25rem)]">
          LEVEL UP!
        </h2>
        <p className="font-display text-xl uppercase tracking-widest">
          Level {previousLevel} to level {level}
        </p>
        {typeof xpEarned === "number" && xpEarned > 0 && (
          <p className="text-lg leading-relaxed">You earned {xpEarned} XP on this run.</p>
        )}
        <PixelButton ref={buttonRef} onClick={onClose}>
          Continue
        </PixelButton>
      </div>
    </div>
  );
}
