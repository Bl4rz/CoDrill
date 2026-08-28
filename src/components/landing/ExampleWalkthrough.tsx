"use client";

import { useEffect, useState } from "react";

const JOB_EXCERPT =
  '"...Looking for a Backend Engineer with 3+ years in Node.js and distributed systems. Comfortable with concurrent request handling and API design..."';

const QUESTION =
  "Given a stream of incoming API request timestamps, write a function that returns how many requests happened in the last 60 seconds, callable repeatedly as new requests arrive.";

const ANSWER = `function requestsInLastMinute(timestamps, now) {
  return timestamps.filter(t => now - t <= 60000).length;
}`;

const FEEDBACK =
  "Correct, but this re-scans the whole array on every call — O(n) per check. Since requests only ever get added, a sliding window (two-pointer or deque) would get this to amortized O(1). You didn't mention complexity until asked — worth leading with it next time.";

type Phase = "question" | "code" | "feedback" | "hold";

/**
 * A single compact example — not another full "moment" mockup like the
 * TypedTerminal/CodeFollowupPreview/ReportPreview trio below. Multiple
 * reviewers asked for exactly this: one real question → answer → feedback
 * chain, small enough to read in under a minute, before committing to a
 * full session. Animated in sequence (question types in, code editor
 * reveals, feedback types in, loops) so it reads as a live moment rather
 * than a wall of static text — driven by chained setTimeout, not
 * requestAnimationFrame, so it keeps progressing even in contexts that
 * throttle rAF.
 */
export function ExampleWalkthrough() {
  const [phase, setPhase] = useState<Phase>("question");
  const [qChars, setQChars] = useState(0);
  const [fChars, setFChars] = useState(0);

  useEffect(() => {
    if (phase === "question") {
      if (qChars < QUESTION.length) {
        const t = setTimeout(() => setQChars((c) => c + 1), 16);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("code"), 500);
      return () => clearTimeout(t);
    }
    if (phase === "code") {
      const t = setTimeout(() => setPhase("feedback"), 900);
      return () => clearTimeout(t);
    }
    if (phase === "feedback") {
      if (fChars < FEEDBACK.length) {
        const t = setTimeout(() => setFChars((c) => c + 1), 12);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("hold"), 3200);
      return () => clearTimeout(t);
    }
    // phase === "hold"
    const t = setTimeout(() => {
      setQChars(0);
      setFChars(0);
      setPhase("question");
    }, 400);
    return () => clearTimeout(t);
  }, [phase, qChars, fChars]);

  const showCode = phase === "code" || phase === "feedback" || phase === "hold";
  const showFeedback = phase === "feedback" || phase === "hold";

  return (
    <div className="card-glass mx-auto w-full max-w-2xl overflow-hidden rounded-lg border border-border text-left shadow-[0_0_50px_-20px_var(--accent-amber)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-raised/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-accent-red/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent-yellow/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent-green/60" />
        <span className="ml-2 font-mono text-[11px] text-muted">
          example.ts — from a real job posting
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5 font-mono text-[13px] leading-relaxed">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-muted">
            Job posting excerpt
          </span>
          <p className="text-muted">{JOB_EXCERPT}</p>
        </div>

        <div className="flex min-h-[3lh] flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-accent-green">
            → Generated question
          </span>
          <p className="text-foreground">
            {QUESTION.slice(0, qChars)}
            {phase === "question" && <span className="text-accent-amber">▊</span>}
          </p>
        </div>

        {showCode && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent-green/15 px-2 py-0.5 text-[11px] text-accent-green">
                JavaScript
              </span>
              <span className="text-[11px] text-muted">Python</span>
              <span className="text-[11px] text-muted">Java</span>
            </div>
            <pre className="mt-1 overflow-x-auto rounded-md bg-surface-raised/60 p-2 text-foreground">
              {ANSWER}
            </pre>
          </div>
        )}

        {showFeedback && (
          <div className="flex min-h-[4lh] flex-col gap-1 border-t border-border pt-3">
            <span className="text-[11px] uppercase tracking-wider text-accent-amber">
              → The feedback it produces
            </span>
            <p className="text-foreground">
              {FEEDBACK.slice(0, fChars)}
              {phase === "feedback" && <span className="text-accent-amber">▊</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
