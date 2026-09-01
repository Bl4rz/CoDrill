"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StoredSession, loadSession, saveSession } from "@/lib/store";
import { Attempt } from "@/lib/types";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { InterviewRunner } from "@/components/InterviewRunner";
import { Spinner } from "@/components/Spinner";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export function SessionShell({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null | undefined>(undefined);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading client-only localStorage on mount
    setSession(loadSession(sessionId));
  }, [sessionId]);

  if (session === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner label="Loading session" />
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-foreground">We couldn&apos;t find that session on this device.</p>
        <Link href="/" className="text-sm text-accent-green hover:underline">
          Start a new session
        </Link>
      </div>
    );
  }

  const { questions, current_question_index } = session;
  const currentQuestion = questions[current_question_index];
  const isFinalQuestion = current_question_index === questions.length - 1;

  async function handleComplete(attempt: Attempt) {
    const updated: StoredSession = {
      ...session!,
      attempts: { ...session!.attempts, [attempt.question_id]: attempt },
    };

    if (current_question_index + 1 < questions.length) {
      updated.current_question_index = current_question_index + 1;
      saveSession(updated);
      setSession(updated);
      return;
    }

    saveSession(updated);
    setSession(updated);
    setReportLoading(true);
    setReportError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_summary: updated.role_summary,
          questions: updated.questions,
          attempts: Object.values(updated.attempts),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      const withReport: StoredSession = { ...updated, report: data.report };
      saveSession(withReport);
      router.push(`/session/${sessionId}/report`);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Something went wrong.");
      setReportLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Start", href: "/start" },
            { label: "Session" },
          ]}
        />
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {session.role_summary.role_title} · {session.role_summary.seniority}
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          {session.role_summary.role_title} — mock interview
        </h1>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {questions.map((q, i) => {
          const done = !!session.attempts[q.id];
          const active = i === current_question_index;
          return (
            <div
              key={q.id}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                active
                  ? "border-accent-amber text-accent-amber"
                  : done
                  ? "border-accent-green/40 text-accent-green"
                  : "border-border text-muted"
              }`}
            >
              <span>{i + 1}</span>
              <DifficultyBadge difficulty={q.difficulty} />
              {done && <span>✓</span>}
            </div>
          );
        })}
      </div>

      {reportLoading ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <Spinner label="Generating your session report" />
        </div>
      ) : (
        <InterviewRunner
          key={currentQuestion.id}
          question={currentQuestion}
          onComplete={handleComplete}
        />
      )}

      {reportError && <p className="text-sm text-accent-red">{reportError}</p>}

      {isFinalQuestion && (
        <p className="text-xs text-muted">
          This is the last question — finishing it will generate your session report.
        </p>
      )}
    </div>
  );
}
