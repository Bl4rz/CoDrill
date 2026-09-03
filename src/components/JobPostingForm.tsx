"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { RoleSummary } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

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
      const res = await fetch("/api/extract-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_posting_text: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      onExtracted(text, data.summary as RoleSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="job-posting" className="text-sm font-medium text-foreground">
        Paste a job posting (URL or full text)
      </label>
      <textarea
        id="job-posting"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="https://... or paste the full job description here"
        rows={10}
        className="w-full resize-y rounded-lg border border-border bg-surface px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green"
        disabled={loading}
      />
      {error && <p className="text-sm text-accent-red">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || text.trim().length < 10}
          className="pixel-press border-2 border-background/40 bg-accent-green px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-40"
          style={{ "--pixel-shadow": "rgba(0,0,0,0.5)" } as CSSProperties}
        >
          {loading ? "Analyzing…" : "Analyze posting"}
        </button>
        {loading && <Spinner label="Reading the posting and extracting role details" />}
      </div>
    </form>
  );
}
