import type { LevelDifficulty } from "@/lib/adventure/types";

const COLOR: Record<LevelDifficulty, string> = { beginner: "var(--green)", easy: "var(--green)", medium: "var(--amber)" };
const PIPS: Record<LevelDifficulty, number> = { beginner: 1, easy: 1, medium: 2 };

/** Same look as the normal runner's difficulty badge, for Adventure's three difficulty names. */
export function DifficultyTag({ difficulty }: { difficulty: LevelDifficulty }) {
  const color = COLOR[difficulty];
  return (
    <span
      className="inline-flex items-center gap-2 border-[3px] px-2 py-0.5 font-display text-xs uppercase tracking-widest"
      style={{ borderColor: color, color }}
    >
      <span className="flex items-center gap-[3px]" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-2 w-2"
            style={i <= PIPS[difficulty] ? { background: color } : { border: `2px solid ${color}` }}
          />
        ))}
      </span>
      {difficulty}
    </span>
  );
}
