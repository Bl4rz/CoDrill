import { Difficulty } from "@/lib/types";

const COLOR: Record<Difficulty, string> = {
  easy: "var(--green)",
  medium: "var(--amber)",
  hard: "var(--red)",
};
const PIPS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
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
