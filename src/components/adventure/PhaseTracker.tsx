import type { Phase } from "@/lib/adventure/config";
import { PHASES } from "@/lib/adventure/config";
import { ArrowIcon, CheckIcon } from "@/components/pixel/icons";

/** Slim HUD: which of the three steps you're on and the score each one got. */
export function PhaseTracker({
  labels,
  scores,
  current,
}: {
  labels: Record<Phase, string>;
  scores: Partial<Record<Phase, number>>;
  current: Phase | null;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Steps">
      {PHASES.map((phase, i) => {
        const score = scores[phase];
        const done = score !== undefined;
        const active = !done && phase === current;
        return (
          <li key={phase} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden="true" className="text-paper">
                <ArrowIcon unit="2px" />
              </span>
            )}
            <span
              className={`flex items-center gap-2 border-[3px] px-2 py-1 font-display text-xs uppercase tracking-widest ${
                done
                  ? "border-green bg-green text-ink"
                  : active
                    ? "border-amber bg-amber text-ink"
                    : "border-dashed border-paper text-paper"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done && <CheckIcon />}
              <span>
                {i + 1}. {labels[phase]}
              </span>
              {done && <span aria-label={`score ${score}`}>{score}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
