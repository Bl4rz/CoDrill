"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JobPostingForm } from "@/components/JobPostingForm";
import { RoleSummaryConfirm } from "@/components/RoleSummaryConfirm";
import { StepProgress } from "@/components/pixel/StepProgress";
import { shadowColor } from "@/components/pixel/style";
import { InterviewQuestion, RoleSummary } from "@/lib/types";
import { createSession } from "@/lib/store";
import { postJson } from "@/lib/api-client";
import { AppHeader } from "@/components/AppHeader";

export default function StartPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"input" | "confirm">("input");
  const [jobPostingText, setJobPostingText] = useState("");
  const [summary, setSummary] = useState<RoleSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateAndContinue(text: string, finalSummary: RoleSummary) {
    setGenerating(true);
    setError(null);
    try {
      const data = await postJson<{ questions: InterviewQuestion[] }>("/api/generate-questions", {
        role_summary: finalSummary,
      });
      const session = createSession(text, finalSummary, data.questions);
      router.push(`/session/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-8 sm:py-12">
      <AppHeader crumbs={[{ label: "Home", href: "/" }, { label: "Start" }]} />

      <div className="flex flex-col gap-3">
        <h1 className="pixel-heading text-3xl sm:text-4xl">Select your quest</h1>
        <p className="max-w-xl text-base leading-relaxed">
          Paste the job posting you&apos;re preparing for. I&apos;ll pull out the role and write
          questions for it.
        </p>
      </div>

      <div className="pixel-panel border-paper bg-ink p-5 sm:p-6" style={shadowColor("var(--green)")}>
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
          // Kept mounted (just hidden) while generating so a failed attempt
          // doesn't throw away what you edited.
          <div hidden={generating}>
            <RoleSummaryConfirm
              summary={summary}
              onBack={() => setStage("input")}
              onConfirm={(finalSummary) => generateAndContinue(jobPostingText, finalSummary)}
            />
          </div>
        )}

        {generating && (
          <StepProgress
            messages={["Reading the posting...", "Writing questions...", "Checking the difficulty mix..."]}
          />
        )}

        {error && (
          <p role="alert" className="mt-4 border-[3px] border-red px-3 py-2 text-base text-red">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
