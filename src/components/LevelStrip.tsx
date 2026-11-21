import { CheckIcon, LockIcon, ArrowIcon } from "@/components/pixel/icons";
import { bossIndex } from "@/lib/levels";
import type { InterviewQuestion } from "@/lib/types";

type State = "done" | "current" | "locked";

const STATE_STYLE: Record<State, string> = {
  done: "phase done",
  current: "phase on",
  locked: "phase",
};

/** LEVEL 1..N badges with locked / current / done states and a BOSS tag on the hardest. */
export function LevelStrip({
  questions,
  currentIndex,
  completedIds,
}: {
  questions: InterviewQuestion[];
  currentIndex: number;
  completedIds: Set<string>;
}) {
  const boss = bossIndex(questions);
  return (
    <ol className="flex flex-wrap gap-3" aria-label="Levels">
      {questions.map((q, i) => {
        const state: State = completedIds.has(q.id) ? "done" : i === currentIndex ? "current" : "locked";
        return (
          <li key={q.id} className="flex flex-col items-start gap-1">
            <span
              className={`${STATE_STYLE[state]} flex items-center gap-2 uppercase tracking-widest`}
              aria-label={`Level ${i + 1}, ${state}${i === boss ? ", boss" : ""}`}
            >
              {state === "done" ? <CheckIcon /> : state === "current" ? <ArrowIcon unit="2px" /> : <LockIcon />}
              Level {i + 1}
            </span>
            {i === boss && (
              <span className="bg-red px-2 py-0.5 font-display text-xs font-medium uppercase tracking-widest text-ink">
                Boss
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
