"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { fetchCloudSessions } from "@/lib/supabase/sessions";
import { StoredSession } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { Spinner } from "@/components/Spinner";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { MiniBarChart } from "@/components/dashboard/MiniBarChart";
import { PixelButton, PixelLink } from "@/components/pixel/PixelButton";
import { SegmentBar } from "@/components/pixel/SegmentBar";
import { StepProgress } from "@/components/pixel/StepProgress";
import { MinusIcon, PlusIcon, ArrowIcon } from "@/components/pixel/icons";
import { shadowColor } from "@/components/pixel/style";
import { letterGrade } from "@/lib/grade";
import { postJson } from "@/lib/api-client";
import type { Difficulty } from "@/lib/types";

interface RoleStats {
  roleTitle: string;
  sessionCount: number;
  avgScore: number;
}

interface ProficiencyRecommendation {
  summary_text: string;
  recommended_roles: { role_title: string; reason: string }[];
  focus_areas: string[];
}

function sessionOverallScore(session: StoredSession): number | null {
  const scored = Object.values(session.attempts).filter((a) => a.scores);
  if (scored.length === 0) return null;
  const total = scored.reduce(
    (sum, a) =>
      sum +
      (a.scores!.correctness_score + a.scores!.communication_score + a.scores!.reasoning_score) /
        3,
    0,
  );
  return total / scored.length;
}

function attemptScore(attempt: StoredSession["attempts"][string] | undefined): number | null {
  if (!attempt?.scores) return null;
  return Math.round(
    (attempt.scores.correctness_score +
      attempt.scores.communication_score +
      attempt.scores.reasoning_score) /
      3,
  );
}

function activityByDay(sessions: StoredSession[]): { label: string; value: number }[] {
  const days: { key: string; label: string }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toDateString(),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
  }
  const counts = new Map<string, number>();
  for (const s of sessions) {
    const key = new Date(s.created_at).toDateString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return days.map((d) => ({ label: d.label, value: counts.get(d.key) ?? 0 }));
}

function difficultyBreakdown(
  sessions: StoredSession[],
): { difficulty: Difficulty; avgScore: number | null }[] {
  const buckets: Record<Difficulty, number[]> = { easy: [], medium: [], hard: [] };
  for (const s of sessions) {
    for (const q of s.questions) {
      const score = attemptScore(s.attempts[q.id]);
      if (score !== null) buckets[q.difficulty].push(score);
    }
  }
  return (["easy", "medium", "hard"] as Difficulty[]).map((difficulty) => ({
    difficulty,
    avgScore: buckets[difficulty].length
      ? Math.round(buckets[difficulty].reduce((a, b) => a + b, 0) / buckets[difficulty].length)
      : null,
  }));
}

function groupByRole(sessions: StoredSession[]): RoleStats[] {
  const groups = new Map<string, StoredSession[]>();
  for (const s of sessions) {
    const key = s.role_summary.role_title || "Unspecified role";
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const stats: RoleStats[] = [];
  for (const [roleTitle, group] of groups) {
    const scores = group.map(sessionOverallScore).filter((n): n is number => n !== null);
    if (scores.length === 0) continue;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    stats.push({ roleTitle, sessionCount: group.length, avgScore });
  }
  return stats.sort((a, b) => b.avgScore - a.avgScore);
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<ProficiencyRecommendation | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Supabase unconfigured is known synchronously
      setUser(null);
      return;
    }
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        setSessions(await fetchCloudSessions());
      }
    });
  }, []);

  async function handleGetRecommendation() {
    setRecLoading(true);
    setRecError(null);
    try {
      const payload = sessions
        .filter((s) => s.report !== null)
        .map((s) => ({
          role_title: s.role_summary.role_title,
          seniority: s.role_summary.seniority,
          tech_stack: s.role_summary.tech_stack,
          overall_score: sessionOverallScore(s) ?? 0,
          report_summary: s.report!.summary_text,
          pattern_insights: s.report!.pattern_insights.map((p) => `${p.title}: ${p.detail}`),
        }));
      const data = await postJson<{ recommendation: ProficiencyRecommendation }>(
        "/api/profile/recommend",
        { sessions: payload },
      );
      setRecommendation(data.recommendation);
    } catch (err) {
      setRecError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRecLoading(false);
    }
  }

  if (user === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner label="Loading dashboard" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-8 sm:py-12">
        <AppHeader crumbs={[{ label: "Home", href: "/" }, { label: "Profile" }]} />
        <div className="pixel-panel flex flex-col items-start gap-4 border-paper bg-ink p-6" style={shadowColor("var(--amber)")}>
          <h1 className="pixel-heading text-2xl">Your dashboard</h1>
          <p className="text-base leading-relaxed">
            Sign in with Google (button at the top) to see runs you did while signed in. Signing in is optional. You
            can practice without it.
          </p>
          <PixelLink href="/start">Start a quest</PixelLink>
        </div>
      </main>
    );
  }

  const roleStats = groupByRole(sessions);
  const completedCount = sessions.filter((s) => s.report !== null).length;
  const allScores = sessions.map(sessionOverallScore).filter((n): n is number => n !== null);
  const avgScoreAllTime = allScores.length
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : null;
  const totalQuestionsAnswered = sessions.reduce(
    (sum, s) => sum + Object.values(s.attempts).filter((a) => a.scores).length,
    0,
  );
  const completionRate = sessions.length > 0 ? Math.round((completedCount / sessions.length) * 100) : 0;
  const activityData = activityByDay(sessions);
  const difficultyStats = difficultyBreakdown(sessions);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-8 sm:py-12">
      <AppHeader crumbs={[{ label: "Home", href: "/" }, { label: "Profile" }]} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="pixel-heading text-3xl">Your dashboard</h1>
          <p className="text-base">
            {completedCount} finished run{completedCount === 1 ? "" : "s"} across {roleStats.length} role
            {roleStats.length === 1 ? "" : "s"}. Signed in as {user.email}.
          </p>
        </div>
        <PixelLink href="/start">New job posting</PixelLink>
      </div>

      {sessions.length > 0 && (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="pixel-panel border-paper bg-ink p-5 sm:col-span-2" style={shadowColor("var(--green)")}>
            <p className="mb-3 font-display text-sm uppercase tracking-widest">Activity, last 7 days</p>
            <MiniBarChart data={activityData} />
          </div>

          <div className="pixel-panel border-paper bg-ink p-5" style={shadowColor("var(--amber)")}>
            <p className="mb-3 font-display text-sm uppercase tracking-widest">Top roles</p>
            {roleStats.length === 0 ? (
              <p className="text-base">Finish a run to see this.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {roleStats.slice(0, 4).map((r) => (
                  <li key={r.roleTitle} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base">{r.roleTitle}</p>
                      <p className="text-sm">
                        {r.sessionCount} run{r.sessionCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="font-display text-lg text-green">{Math.round(r.avgScore)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pixel-panel flex flex-col items-center justify-center gap-1 border-paper bg-ink p-5 text-center" style={shadowColor("var(--paper)")}>
            <p className="font-display text-6xl text-green">{avgScoreAllTime ?? "-"}</p>
            <p className="font-display text-sm uppercase tracking-widest">Average score</p>
            <p className="text-sm">
              {totalQuestionsAnswered} question{totalQuestionsAnswered === 1 ? "" : "s"} answered
            </p>
          </div>

          <div className="pixel-panel flex flex-col justify-center gap-3 border-paper bg-ink p-5" style={shadowColor("var(--paper)")}>
            <SegmentBar label="Runs finished" value={completionRate} />
            <p className="text-sm">
              {completedCount} of {sessions.length} started
            </p>
          </div>

          <div className="pixel-panel border-paper bg-ink p-5" style={shadowColor("var(--paper)")}>
            <p className="mb-3 font-display text-sm uppercase tracking-widest">By difficulty</p>
            <div className="flex flex-col gap-3">
              {difficultyStats.map((d) => (
                <SegmentBar
                  key={d.difficulty}
                  label={d.difficulty}
                  value={d.avgScore ?? 0}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        {completedCount >= 2 && (
          <section className="pixel-panel border-paper bg-ink p-5" style={shadowColor("var(--amber)")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base uppercase tracking-widest text-amber">
                Which roles are you ready for?
              </h2>
              {!recLoading && (
                <PixelButton variant="amber" size="sm" onClick={handleGetRecommendation}>
                  {recommendation ? "Refresh" : "Get recommendation"}
                </PixelButton>
              )}
            </div>

            {recError && (
              <p role="alert" className="mt-3 border-[3px] border-red px-3 py-2 text-base text-red">
                {recError}
              </p>
            )}
            {recLoading && (
              <div className="mt-4">
                <StepProgress messages={["Reading your history...", "Comparing roles...", "Writing advice..."]} />
              </div>
            )}

            {recommendation && (
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-base leading-relaxed">{recommendation.summary_text}</p>

                <div className="flex flex-col gap-3">
                  {recommendation.recommended_roles.map((r, i) => (
                    <div key={i} className="border-[3px] border-green p-3">
                      <p className="font-display text-base uppercase tracking-wide text-green">{r.role_title}</p>
                      <p className="mt-1 text-base">{r.reason}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="font-display text-sm uppercase tracking-widest">Focus on next</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {recommendation.focus_areas.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-base">
                        <span className="mt-1.5 shrink-0 text-amber" aria-hidden="true">
                          <ArrowIcon unit="2px" />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="pixel-heading text-xl">Past runs</h2>
          {sessions.length === 0 && (
            <p className="text-base">
              Nothing saved to your account yet. Runs you do while signed in show up here.
            </p>
          )}
          {sessions.map((s) => {
            const score = sessionOverallScore(s);
            const isExpanded = expandedId === s.id;
            return (
              <div key={s.id} className="border-[3px] border-paper">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left hover:text-amber focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium">{s.role_summary.role_title}</p>
                    <p className="text-sm">
                      {new Date(s.created_at).toLocaleDateString()} · {s.role_summary.seniority} ·{" "}
                      {s.questions.length} question{s.questions.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="font-display text-lg">
                      {score !== null ? `${letterGrade(score)} ${Math.round(score)}` : s.report ? "-" : "In progress"}
                    </p>
                    <span className="text-green" aria-hidden="true">
                      {isExpanded ? <MinusIcon /> : <PlusIcon />}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="flex flex-col gap-3 border-t-[3px] border-paper p-4">
                    {s.questions.map((q, i) => {
                      const qScore = attemptScore(s.attempts[q.id]);
                      return (
                        <div
                          key={q.id}
                          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-xs uppercase tracking-widest">Level {i + 1}</span>
                            <DifficultyBadge difficulty={q.difficulty} />
                          </div>
                          <p className="flex-1 text-base sm:truncate">{q.question_text}</p>
                          <span className="font-display text-base">{qScore ?? "-"}</span>
                        </div>
                      );
                    })}
                    <div>
                      <PixelLink href={s.report ? `/session/${s.id}/report` : `/session/${s.id}`} variant="ghost" size="sm">
                        {s.report ? "View full report" : "Resume run"}
                      </PixelLink>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
