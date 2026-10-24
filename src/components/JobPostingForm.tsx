"use client";

import { useState } from "react";
import { RoleSummary } from "@/lib/types";
import { PixelButton } from "@/components/pixel/PixelButton";
import { StepProgress } from "@/components/pixel/StepProgress";
import { postJson } from "@/lib/api-client";
import { MAX_POSTING_CHARS } from "@/lib/limits";

export function JobPostingForm({
  onExtracted,
}: {
  onExtracted: (jobPostingText: string, summary: RoleSummary) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await postJson<{ summary: RoleSummary }>("/api/extract-role", {
        job_posting_text: text,
      });
      onExtracted(text, data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="job-posting" className="font-display text-sm uppercase tracking-widest">
        Paste a job posting (link or full text)
      </label>
      <textarea
        id="job-posting"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="https://... or paste the full job description here"
        rows={10}
        maxLength={MAX_POSTING_CHARS}
        className="code w-full resize-y border-[3px] border-paper bg-ink px-4 py-3 text-sm text-paper placeholder:text-green focus:outline-3 focus:outline-offset-2 focus:outline-amber"
        disabled={loading}
      />
      {error && (
        <p role="alert" className="border-[3px] border-red px-3 py-2 text-base text-red">
          {error}
        </p>
      )}
      {loading ? (
        <StepProgress
          messages={["Reading the posting...", "Finding the tech stack...", "Picking focus areas..."]}
        />
      ) : (
        <div>
          <PixelButton type="submit" disabled={text.trim().length < 10}>
            Analyze posting
          </PixelButton>
        </div>
      )}
    </form>
  );
}
