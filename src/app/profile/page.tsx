"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { fetchCloudSessions } from "@/lib/supabase/sessions";
import { StoredSession } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { Spinner } from "@/components/Spinner";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface RoleStats {
  roleTitle: string;
  sessionCount: number;
  avgScore: number;
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
        <p className="text-foreground">Sign in to see your profile and past sessions.</p>
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

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Your profile</h1>
        <p className="mt-1 text-sm text-muted">
          {completedCount} completed session{completedCount === 1 ? "" : "s"} across{" "}
          {roleStats.length} role{roleStats.length === 1 ? "" : "s"}.
        </p>
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
          return (
            <Link
              key={s.id}
              href={s.report ? `/session/${s.id}/report` : `/session/${s.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition hover:border-accent-green/40"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{s.role_summary.role_title}</p>
                <p className="text-xs text-muted">
                  {new Date(s.created_at).toLocaleDateString()} · {s.role_summary.seniority}
                </p>
              </div>
              <p className="font-mono text-sm text-muted">
                {score !== null ? Math.round(score) : s.report ? "—" : "in progress"}
              </p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
