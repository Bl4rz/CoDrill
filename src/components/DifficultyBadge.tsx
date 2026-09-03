import type { CSSProperties } from "react";
import { Difficulty } from "@/lib/types";

const STYLES: Record<Difficulty, string> = {
  easy: "bg-accent-green/10 text-accent-green border-accent-green/50",
  medium: "bg-accent-amber/10 text-accent-amber border-accent-amber/50",
  hard: "bg-accent-red/10 text-accent-red border-accent-red/50",
};

const PIPS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={`pixel-panel inline-flex items-center gap-1.5 px-2 py-1 font-pixel text-[9px] uppercase ${STYLES[difficulty]}`}
      style={{ "--pixel-shadow": "currentColor" } as CSSProperties}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 ${i <= PIPS[difficulty] ? "bg-current" : "bg-current opacity-20"}`}
          />
        ))}
      </span>
      {difficulty}
    </span>
  );
}
