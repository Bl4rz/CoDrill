"use client";

import { SpeakerIcon } from "@/components/pixel/icons";
import { setSoundEnabled, useSoundEnabled } from "@/lib/sound";

export function SoundToggle() {
  const on = useSoundEnabled();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`Sound ${on ? "on" : "off"}`}
      onClick={() => setSoundEnabled(!on)}
      className="notch flex min-h-11 items-center gap-2 bg-ink/90 px-3 font-display text-sm font-medium uppercase tracking-widest text-paper shadow-[inset_0_0_0_3px_var(--line)] [--n:3px] hover:text-amber hover:shadow-[inset_0_0_0_3px_var(--amber)]"
    >
      <SpeakerIcon on={on} />
      <span>
        <span className="hidden sm:inline">Sound </span>
        {on ? "on" : "off"}
      </span>
    </button>
  );
}
