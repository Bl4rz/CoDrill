"use client";

import { useEffect, useState } from "react";
import { StoredSession } from "@/lib/store";
import { Attempt, InterviewQuestion } from "@/lib/types";
import { bossIndex } from "@/lib/levels";
import { letterGrade } from "@/lib/grade";
import { playBlip } from "@/lib/sound";
import { AppHeader } from "@/components/AppHeader";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { GradeBox } from "@/components/pixel/GradeBox";
import { Mascot, type Expression } from "@/components/pixel/Mascot";
import { PixelButton, PixelLink } from "@/components/pixel/PixelButton";
import { SegmentBar } from "@/components/pixel/SegmentBar";
import { ArrowIcon, CoinIcon } from "@/components/pixel/icons";
import { LevelUpDialog } from "@/components/pixel/LevelUpDialog";
import type { RunSummaryResponse } from "@/lib/progression/types";
import { shadowColor } from "@/components/pixel/style";

type ScoreAxis = "correctness" | "communication" | "reasoning";

const AXES: { key: ScoreAxis; label: string }[] = [
  { key: "correctness", label: "Correctness" },
  { key: "communication", label: "Communication" },
  { key: "reasoning", label: "Reasoning" },
];

const NEXT_ACTION_COPY: Record<ScoreAxis, string> = {
  correctness:
    "Before you call a solution done, trace it with a concrete example. Small correctness gaps were the most consistent thing across your questions this session.",
  communication:
    "Narrate your thinking as you work, not just when asked. Stating assumptions and trade-offs out loud was the biggest gap this session.",
  reasoning:
    "Lead with time and space complexity, and why you picked this approach over the others, before you write code. That's where you lost the most ground this session.",
};

type Scored = { question: InterviewQuestion; attempt: Attempt; level: number };

function axisScore(attempt: Attempt, axis: ScoreAxis): number {
  const s = attempt.scores;
  if (!s) return 0;
  return axis === "correctness"
    ? s.correctness_score
    : axis === "communication"
      ? s.communication_score
      : s.reasoning_score;
}

function averages(scored: Scored[]): Record<ScoreAxis, number> {
  const withScores = scored.filter((x) => x.attempt.scores);
  const out = { correctness: 0, communication: 0, reasoning: 0 };
  if (withScores.length === 0) return out;
  for (const axis of AXES) {
    out[axis.key] =
      withScores.reduce((sum, x) => sum + axisScore(x.attempt, axis.key), 0) / withScores.length;
  }
  return out;
}

function weakestAxis(avg: Record<ScoreAxis, number>, hasScores: boolean): ScoreAxis | null {
  if (!hasScores) return null;
  return AXES.reduce((weakest, axis) => (avg[axis.key] < avg[weakest.key] ? axis : weakest)).key;
}

function expressionForScore(overall: number): Expression {
  if (overall >= 70) return "impressed";
  if (overall >= 50) return "neutral";
  return "concerned";
}

export function ReportView({ session }: { session: StoredSession }) {
  const report = session.report;
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const [run, setRun] = useState<RunSummaryResponse | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const sessionId = session.id;

  // What this run earned, from the server's own record. Signed-out visitors and
  // runs the server never issued just get a non-OK response and see nothing extra.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const res = await fetch(`/api/player/run?session_id=${encodeURIComponent(sessionId)}`);
        if (!res.ok || cancelled) return;
        const summary = (await res.json()) as RunSummaryResponse;
        if (cancelled) return;
        setRun(summary);
        const seenKey = `codrill:levelup-shown:${sessionId}`;
        if (summary.level_after > summary.level_before && !localStorage.getItem(seenKey)) {
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          // After the grade and bars have finished filling in.
          timer = setTimeout(() => !cancelled && setShowLevelUp(true), reduced ? 0 : 3600);
        }
      } catch {
        // No progress info to show; the report itself is unaffected.
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  function closeLevelUp() {
    try {
      localStorage.setItem(`codrill:levelup-shown:${sessionId}`, "1");
    } catch {
      // storage blocked: the dialog may show again on a revisit
    }
    setShowLevelUp(false);
  }

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(() => playBlip("grade"), reduced ? 0 : 3200);
    return () => clearTimeout(id);
  }, []);

  if (!report) return null;

  const boss = bossIndex(session.questions);
  const scored: Scored[] = session.questions
    .map((question, i) => ({ question, attempt: session.attempts[question.id], level: i + 1 }))
    .filter((x): x is Scored => Boolean(x.attempt));
  const avg = averages(scored);
  const hasScores = scored.some((x) => x.attempt.scores);
  const overall = (avg.correctness + avg.communication + avg.reasoning) / 3;
  const letter = letterGrade(overall);
  const nextAxis = weakestAxis(avg, hasScores);
  const [mainPattern, ...otherPatterns] = report.pattern_insights;

  const reportText = (): string => {
    const lines = [
      "CODRILL: RUN COMPLETE",
      `${session.role_summary.role_title} (${session.role_summary.seniority})`,
      `Grade ${letter}, ${Math.round(overall)}/100`,
      AXES.map((a) => `${a.label} ${Math.round(avg[a.key])}`).join(", "),
      "",
      report.summary_text,
    ];
    if (report.pattern_insights.length) {
      lines.push("", "Patterns:");
      report.pattern_insights.forEach((p) => lines.push(`- ${p.title}: ${p.detail}`));
    }
    lines.push("", "Levels:");
    scored.forEach(({ question, attempt, level }) => {
      lines.push(
        `${level}. [${question.difficulty}] ${question.topic}: ${AXES.map((a) => `${a.label} ${axisScore(attempt, a.key)}`).join(", ")}`,
      );
    });
    if (report.practice_recommendations.length) {
      lines.push("", "Practice before the real interview:");
      report.practice_recommendations.forEach((r) => lines.push(`- ${r}`));
    }
    return lines.join("\n");
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText());
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied("idle"), 2200);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-8 sm:py-12">
      <AppHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Start", href: "/start" }, { label: "Report" }]}
      />

      <header className="flex flex-col gap-3">
        <p className="font-display text-xs uppercase tracking-widest text-green">
          {session.role_summary.role_title} · {session.role_summary.seniority}
        </p>
        <h1 className="pixel-title text-[clamp(1.25rem,6vw,3rem)]">RUN COMPLETE</h1>
      </header>

      <section
        aria-label="Score"
        className="pixel-panel flex flex-col items-center gap-6 border-paper bg-ink p-5 sm:flex-row sm:p-6"
        style={shadowColor("var(--green)")}
      >
        <GradeBox letter={letter} label="Run grade" />
        <div className="flex w-full flex-1 flex-col gap-4">
          {AXES.map((axis, i) => (
            <SegmentBar
              key={axis.key}
              label={axis.label}
              value={avg[axis.key]}
              animate
              delay={i * 1000}
            />
          ))}
        </div>
      </section>

      {run && run.xp_earned > 0 && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-display text-lg uppercase tracking-widest">
          <span className="text-green">+{run.xp_earned} XP this run</span>
          {run.coins_earned > 0 && (
            <span className="flex items-center gap-1 text-amber">
              <CoinIcon unit="3px" /> +{run.coins_earned}
            </span>
          )}
          <span>
            Level {run.level_now}
          </span>
        </p>
      )}

      {mainPattern && (
        <section className="flex items-end gap-4" aria-label="Pattern">
          <div className="hidden shrink-0 sm:block">
            <Mascot expression={expressionForScore(overall)} scale={1} />
          </div>
          <div className="px-dialog flex-1 p-5" style={{ "--drop": "var(--amber)" } as React.CSSProperties}>
            <p className="mb-2 w-fit bg-ink px-2 py-1 font-display text-xs uppercase tracking-widest text-amber">
              Pattern spotted
            </p>
            <p className="font-display text-lg uppercase tracking-wide">{mainPattern.title}</p>
            <p className="mt-1 text-base leading-relaxed">{mainPattern.detail}</p>
          </div>
        </section>
      )}

      {nextAxis && (
        <section className="pixel-panel border-amber bg-ink p-5" style={shadowColor("var(--amber)")}>
          <p className="mb-2 font-display text-sm uppercase tracking-widest text-amber">Your next rep</p>
          <p className="text-base leading-relaxed">{NEXT_ACTION_COPY[nextAxis]}</p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="pixel-heading text-xl">Overall readiness</h2>
        <p className="text-base leading-relaxed">{report.summary_text}</p>
      </section>

      {otherPatterns.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="pixel-heading text-xl">More patterns</h2>
          {otherPatterns.map((p, i) => (
            <div key={i} className="border-[3px] border-amber p-4">
              <p className="font-display text-sm uppercase tracking-widest text-amber">{p.title}</p>
              <p className="mt-1 text-base leading-relaxed">{p.detail}</p>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="pixel-heading text-xl">Level by level</h2>
        {scored.map(({ question, attempt, level }) => (
          <div key={question.id} className="flex flex-col gap-4 border-[3px] border-paper p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-base uppercase tracking-widest">Level {level}</span>
              {level - 1 === boss && (
                <span className="bg-red px-2 py-0.5 font-display text-xs uppercase tracking-widest text-ink">
                  Boss
                </span>
              )}
              <DifficultyBadge difficulty={question.difficulty} />
              <span className="font-display text-xs uppercase tracking-widest text-green">{question.topic}</span>
            </div>
            <p className="text-base leading-relaxed">{question.question_text}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {AXES.map((axis) => (
                <SegmentBar key={axis.key} label={axis.label} value={axisScore(attempt, axis.key)} />
              ))}
            </div>
            {attempt.scores?.feedback_text && (
              <p className="text-base leading-relaxed">{attempt.scores.feedback_text}</p>
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="pixel-heading text-xl">Practice before the real interview</h2>
        <ul className="flex flex-col gap-3">
          {report.practice_recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-3 border-[3px] border-paper p-3 text-base">
              <span className="mt-1.5 shrink-0 text-green" aria-hidden="true">
                <ArrowIcon unit="2px" />
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-4">
        <PixelLink href="/start">Try another posting</PixelLink>
        <PixelButton variant="ghost" onClick={copyReport}>
          {copied === "copied" ? "Copied" : copied === "failed" ? "Couldn't copy" : "Copy report"}
        </PixelButton>
      </div>

      {showLevelUp && run && (
        <LevelUpDialog
          level={run.level_after}
          previousLevel={run.level_before}
          xpEarned={run.xp_earned}
          onClose={closeLevelUp}
        />
      )}
    </div>
  );
}
