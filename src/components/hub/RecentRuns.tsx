import { Mascot } from "@/components/pixel/Mascot";
import type { RunView } from "@/lib/progression/types";

/** The last five runs. Empty state is a real message, never sample data. */
export function RecentRuns({ runs }: { runs: RunView[] }) {
  return (
    <section aria-labelledby="runs-title" className="flex flex-col gap-4">
      <h2 id="runs-title" className="pixel-heading text-xl">
        Recent runs
      </h2>
      {runs.length === 0 ? (
        <div className="flex items-center gap-4 border-[3px] border-dashed border-paper p-4">
          <div className="shrink-0">
            <Mascot crop="head" expression="thinking" unit="3px" title="" />
          </div>
          <p className="text-base leading-relaxed">No runs yet. Start one and it will show up here.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {runs.map((run) => (
            <li key={run.session_id} className="flex flex-col gap-1 border-[3px] border-paper p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-base font-medium">{run.role_title}</p>
                <p className="shrink-0 font-display text-sm uppercase tracking-widest text-green">
                  +{run.xp_earned} XP
                </p>
              </div>
              <p className="text-sm">
                {new Date(run.created_at).toLocaleDateString()} · {run.questions_done}/{run.questions_total} questions
                {run.avg_score !== null ? ` · average ${run.avg_score}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
