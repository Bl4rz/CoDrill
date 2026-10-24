import type { Letter } from "@/lib/grade";

const COLOR: Record<Letter, string> = {
  A: "var(--green)",
  B: "var(--green)",
  C: "var(--amber)",
  D: "var(--amber)",
  F: "var(--red)",
};

/** Big letter in a hard-shadowed box. */
export function GradeBox({ letter, label = "Grade" }: { letter: Letter; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="pixel-panel flex h-28 w-28 items-center justify-center border-paper bg-ink font-display text-7xl font-medium sm:h-32 sm:w-32 sm:text-8xl"
        style={{ color: COLOR[letter], "--pixel-shadow": COLOR[letter] } as React.CSSProperties}
        aria-label={`${label} ${letter}`}
      >
        {letter}
      </div>
      <p className="font-display text-sm uppercase tracking-widest">{label}</p>
    </div>
  );
}
