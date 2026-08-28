import Link from "next/link";
import { StoredSession } from "@/lib/store";
import { DifficultyBadge } from "@/components/DifficultyBadge";

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75 ? "bg-accent-green" : value >= 50 ? "bg-accent-amber" : "bg-accent-red";
  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ReportView({ session }: { session: StoredSession }) {
  const report = session.report;
  if (!report) return null;

  const attempts = session.questions
    .map((q) => ({ question: q, attempt: session.attempts[q.id] }))
    .filter((x) => x.attempt);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-14">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {session.role_summary.role_title} · {session.role_summary.seniority}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">Session report</h1>
      </header>

      <section className="rounded-lg border border-border bg-surface p-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Overall readiness
        </p>
        <p className="text-base leading-relaxed text-foreground">{report.summary_text}</p>
      </section>

      <section className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Per-question breakdown
        </p>
        {attempts.map(({ question, attempt }) => (
          <div key={question.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <DifficultyBadge difficulty={question.difficulty} />
              <span className="text-xs uppercase tracking-wide text-muted">{question.topic}</span>
            </div>
            <p className="mb-3 text-sm text-foreground">{question.question_text}</p>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <ScoreBar label="Correctness" value={attempt.scores?.correctness_score ?? 0} />
              <ScoreBar label="Communication" value={attempt.scores?.communication_score ?? 0} />
              <ScoreBar label="Reasoning" value={attempt.scores?.reasoning_score ?? 0} />
            </div>
            <p className="text-sm leading-relaxed text-muted">{attempt.scores?.feedback_text}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Patterns across this session
        </p>
        {report.pattern_insights.map((p, i) => (
          <div key={i} className="rounded-lg border border-accent-amber/30 bg-accent-amber/5 p-4">
            <p className="mb-1 text-sm font-medium text-accent-amber">{p.title}</p>
            <p className="text-sm leading-relaxed text-foreground">{p.detail}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Practice before your real interview
        </p>
        <ul className="flex flex-col gap-2">
          {report.practice_recommendations.map((r, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-foreground"
            >
              <span className="mt-0.5 text-accent-green">→</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/" className="text-sm text-accent-green hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}
