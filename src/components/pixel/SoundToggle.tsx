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
      className="flex items-center gap-2 border-[3px] border-paper bg-ink px-2.5 py-2 font-display text-sm uppercase tracking-widest text-paper hover:border-amber hover:text-amber focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber"
    >
      <SpeakerIcon on={on} />
      <span>
        <span className="hidden sm:inline">Sound </span>
        {on ? "on" : "off"}
      </span>
    </button>
  );
}
