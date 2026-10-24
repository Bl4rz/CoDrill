"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StoredSession, loadSession, saveSession } from "@/lib/store";
import { Attempt } from "@/lib/types";
import { bossIndex } from "@/lib/levels";
import { AppHeader } from "@/components/AppHeader";
import { InterviewRunner } from "@/components/InterviewRunner";
import { LevelStrip } from "@/components/LevelStrip";
import { PixelLink } from "@/components/pixel/PixelButton";
import { StepProgress } from "@/components/pixel/StepProgress";
import { Spinner } from "@/components/Spinner";
import { postJson } from "@/lib/api-client";
import type { SessionReport } from "@/lib/types";

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
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="font-display text-xl uppercase tracking-widest">Save file not found</p>
        <p className="text-base">That session isn&apos;t saved on this device.</p>
        <PixelLink href="/start">Start a new quest</PixelLink>
      </div>
    );
  }

  const { questions, current_question_index } = session;
  const currentQuestion = questions[current_question_index];
  const boss = bossIndex(questions);
  const completedIds = new Set(Object.keys(session.attempts));
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
      const data = await postJson<{ report: SessionReport }>("/api/report", {
        role_summary: updated.role_summary,
        questions: updated.questions,
        attempts: Object.values(updated.attempts),
      });
      const withReport: StoredSession = { ...updated, report: data.report };
      saveSession(withReport);
      router.push(`/session/${sessionId}/report`);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Something went wrong.");
      setReportLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8 sm:py-10">
      <AppHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Start", href: "/start" }, { label: "Session" }]}
      />

      <div className="flex flex-col gap-2">
        <p className="font-display text-xs uppercase tracking-widest text-green">
          {session.role_summary.seniority}
        </p>
        <h1 className="pixel-heading text-2xl sm:text-3xl">{session.role_summary.role_title}</h1>
      </div>

      <LevelStrip
        questions={questions}
        currentIndex={current_question_index}
        completedIds={completedIds}
      />

      {reportLoading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <StepProgress
            messages={["Adding up your scores...", "Looking for patterns...", "Writing your report..."]}
          />
        </div>
      ) : (
        <InterviewRunner
          key={currentQuestion.id}
          sessionId={sessionId}
          question={currentQuestion}
          levelNumber={current_question_index + 1}
          levelCount={questions.length}
          isBoss={current_question_index === boss}
          onComplete={handleComplete}
        />
      )}

      {reportError && (
        <p role="alert" className="border-[3px] border-red px-3 py-2 text-base text-red">
          {reportError}
        </p>
      )}

      {isFinalQuestion && !reportLoading && (
        <p className="text-base">This is the last level. Finishing it builds your report.</p>
      )}
    </div>
  );
}
