"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { JobPostingForm } from "@/components/JobPostingForm";
import { RoleSummaryConfirm } from "@/components/RoleSummaryConfirm";
import { Spinner } from "@/components/Spinner";
import { RoleSummary } from "@/lib/types";
import { createSession } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { AuthButton } from "@/components/AuthButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function StartPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"input" | "confirm">("input");
  const [jobPostingText, setJobPostingText] = useState("");
  const [summary, setSummary] = useState<RoleSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(finalSummary: RoleSummary) {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_summary: finalSummary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      const session = createSession(jobPostingText, finalSummary, data.questions);
      router.push(`/session/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <Logo className="h-6 w-6" />
            <span className="font-mono text-xs uppercase tracking-widest text-muted">
              Codrill
            </span>
          </Link>
          <AuthButton />
        </div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Start" }]} />
        <h1 className="font-display text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          Paste the job posting you&apos;re preparing for.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          We&apos;ll extract the role, generate tailored questions, and start your mock interview.
        </p>
      </header>

      <div className="rounded-lg border border-border-subtle bg-surface-raised/40 p-px">
        <div className="rounded-[7px] bg-background p-6">
          {stage === "input" && (
            <JobPostingForm
              onExtracted={(text, extractedSummary) => {
                setJobPostingText(text);
                setSummary(extractedSummary);
                setStage("confirm");
              }}
            />
          )}

          {stage === "confirm" && summary && (
            <RoleSummaryConfirm
              summary={summary}
              onBack={() => setStage("input")}
              onConfirm={handleConfirm}
            />
          )}

          {error && <p className="mt-4 text-sm text-accent-red">{error}</p>}
          {generating && (
            <div className="mt-4">
              <Spinner label="Generating your interview questions" />
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted">
        Your first mock interview session is free, start to finish — no signup required.
      </p>
    </main>
  );
}
