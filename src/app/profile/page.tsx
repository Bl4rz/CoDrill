"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { fetchCloudSessions } from "@/lib/supabase/sessions";
import { StoredSession } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { Spinner } from "@/components/Spinner";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DifficultyBadge } from "@/components/DifficultyBadge";

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
      const res = await fetch("/api/profile/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
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
        <Spinner label="Loading profile" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-foreground">Sign in to see your dashboard and past sessions.</p>
        <Link href="/" className="text-sm text-accent-green hover:underline">
          ← Back to home
        </Link>
      </div>
    );
  }

  const roleStats = groupByRole(sessions);
  const strongest = roleStats.find((r) => r.sessionCount >= 2) ?? null;
  const completedCount = sessions.filter((s) => s.report !== null).length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted">Codrill</span>
        </Link>
        <span className="font-mono text-xs text-muted">{user.email}</span>
      </header>

      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-foreground">Your dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {completedCount} completed session{completedCount === 1 ? "" : "s"} across{" "}
            {roleStats.length} role{roleStats.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/start"
          className="pixel-press border-2 border-background/40 bg-accent-green px-4 py-2 text-sm font-medium text-background"
          style={{ "--pixel-shadow": "rgba(0,0,0,0.5)" } as CSSProperties}
        >
          + New job posting
        </Link>
      </div>

      {strongest && (
        <section className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-accent-green">
            Your most consistent role
          </p>
          <p className="text-base text-foreground">
            <span className="font-semibold">{strongest.roleTitle}</span> — averaging{" "}
            {Math.round(strongest.avgScore)} across {strongest.sessionCount} sessions
          </p>
        </section>
      )}

      {completedCount >= 2 && (
        <section
          className="pixel-panel border-accent-amber/40 bg-surface-glass p-5"
          style={{ "--pixel-shadow": "var(--accent-amber)" } as CSSProperties}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-pixel text-[9px] uppercase tracking-wider text-accent-amber">
              AI proficiency recommendation
            </p>
            <button
              type="button"
              onClick={handleGetRecommendation}
              disabled={recLoading}
              className="pixel-press border-2 border-background/40 bg-accent-amber px-3 py-1.5 text-xs font-medium text-background disabled:opacity-40"
              style={{ "--pixel-shadow": "rgba(0,0,0,0.5)" } as CSSProperties}
            >
              {recLoading ? "Analyzing…" : recommendation ? "Refresh" : "Get recommendation"}
            </button>
          </div>

          {recError && <p className="mt-3 text-sm text-accent-red">{recError}</p>}
          {recLoading && !recommendation && (
            <div className="mt-4 flex justify-center">
              <Spinner label="Reviewing your session history" />
            </div>
          )}

          {recommendation && (
            <div className="mt-4 flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-foreground">{recommendation.summary_text}</p>

              <div className="flex flex-col gap-2">
                {recommendation.recommended_roles.map((r, i) => (
                  <div key={i} className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-3">
                    <p className="text-sm font-semibold text-accent-green">{r.role_title}</p>
                    <p className="mt-0.5 text-sm text-muted">{r.reason}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Focus on next</p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {recommendation.focus_areas.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-0.5 text-accent-amber">→</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}

      {roleStats.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">By job position</p>
          {roleStats.map((r) => (
            <div
              key={r.roleTitle}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{r.roleTitle}</p>
                <p className="text-xs text-muted">
                  {r.sessionCount} session{r.sessionCount === 1 ? "" : "s"}
                </p>
              </div>
              <p className="font-mono text-lg text-accent-green">{Math.round(r.avgScore)}</p>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Past sessions</p>
        {sessions.length === 0 && (
          <p className="text-sm text-muted">
            No sessions saved to your account yet — sessions you run while signed in will show up
            here.
          </p>
        )}
        {sessions.map((s) => {
          const score = sessionOverallScore(s);
          const isExpanded = expandedId === s.id;
          return (
            <div key={s.id} className="rounded-lg border border-border bg-surface">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{s.role_summary.role_title}</p>
                  <p className="text-xs text-muted">
                    {new Date(s.created_at).toLocaleDateString()} · {s.role_summary.seniority} ·{" "}
                    {s.questions.length} question{s.questions.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-mono text-sm text-muted">
                    {score !== null ? Math.round(score) : s.report ? "—" : "in progress"}
                  </p>
                  <span className="text-xs text-muted">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="flex flex-col gap-2 border-t border-border-subtle p-4">
                  {s.questions.map((q) => {
                    const qScore = attemptScore(s.attempts[q.id]);
                    return (
                      <div
                        key={q.id}
                        className="flex flex-col gap-1.5 rounded-md bg-surface-raised px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                      >
                        <div className="flex items-center gap-2">
                          <DifficultyBadge difficulty={q.difficulty} />
                          <span className="text-xs uppercase tracking-wide text-muted">{q.topic}</span>
                        </div>
                        <p className="flex-1 text-sm text-foreground sm:truncate">{q.question_text}</p>
                        <span className="font-mono text-xs text-muted">{qScore ?? "—"}</span>
                      </div>
                    );
                  })}
                  <Link
                    href={s.report ? `/session/${s.id}/report` : `/session/${s.id}`}
                    className="mt-1 text-xs text-accent-green hover:underline"
                  >
                    {s.report ? "View full report →" : "Resume session →"}
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
