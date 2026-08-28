import { Difficulty } from "@/lib/types";

const STYLES: Record<Difficulty, string> = {
  easy: "bg-accent-green/10 text-accent-green border-accent-green/30",
  medium: "bg-accent-amber/10 text-accent-amber border-accent-amber/30",
  hard: "bg-accent-red/10 text-accent-red border-accent-red/30",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-mono uppercase tracking-wide ${STYLES[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}
