"use client";

import { useEffect, useState } from "react";

const FOLLOWUP_QUESTION =
  "What's the time complexity here, and how would it change if the input was 10x larger?";

export function CodeFollowupPreview() {
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (charIndex >= FOLLOWUP_QUESTION.length) {
      const reset = setTimeout(() => setCharIndex(0), 3200);
      return () => clearTimeout(reset);
    }
    const t = setTimeout(() => setCharIndex((c) => c + 1), 24);
    return () => clearTimeout(t);
  }, [charIndex]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface text-left shadow-[0_0_60px_-15px_var(--accent-amber)]">
      <div className="flex items-center gap-2 border-b border-border bg-surface-raised px-4 py-2.5">
        <span className="rounded bg-accent-green/15 px-2 py-0.5 font-mono text-[11px] text-accent-green">
          JavaScript
        </span>
        <span className="font-mono text-[11px] text-muted">Python</span>
        <span className="font-mono text-[11px] text-muted">Java</span>
      </div>
      <div className="p-4 font-mono text-[12.5px] leading-relaxed">
        <p>
          <span className="text-accent-purple">function</span>{" "}
          <span className="text-accent-blue">firstDuplicate</span>
          <span className="text-foreground">(nums) {"{"}</span>
        </p>
        <p className="pl-4">
          <span className="text-accent-purple">const</span>{" "}
          <span className="text-foreground">seen = </span>
          <span className="text-accent-purple">new</span>{" "}
          <span className="text-accent-blue">Set</span>
          <span className="text-foreground">();</span>
        </p>
        <p className="pl-4">
          <span className="text-accent-purple">for</span>{" "}
          <span className="text-foreground">(</span>
          <span className="text-accent-purple">const</span>{" "}
          <span className="text-foreground">n </span>
          <span className="text-accent-purple">of</span>{" "}
          <span className="text-foreground">nums) {"{"}</span>
        </p>
        <p className="pl-8">
          <span className="text-accent-purple">if</span>{" "}
          <span className="text-foreground">(seen.has(n)) </span>
          <span className="text-accent-purple">return</span>{" "}
          <span className="text-foreground">n;</span>
        </p>
        <p className="pl-8 text-foreground">seen.add(n);</p>
        <p className="pl-4 text-foreground">{"}"}</p>
        <p>
          <span className="text-accent-purple">return</span>{" "}
          <span className="text-accent-yellow">null</span>
          <span className="text-foreground">;</span>
        </p>
        <p className="text-foreground">{"}"}</p>
      </div>
      <div className="border-t border-border bg-surface-raised/50 p-4 font-mono text-[13px] leading-relaxed">
        <p className="text-muted">
          <span className="text-accent-green">interviewer&gt;</span>{" "}
          {FOLLOWUP_QUESTION.slice(0, charIndex)}
          {charIndex < FOLLOWUP_QUESTION.length && <span className="text-accent-amber">▊</span>}
        </p>
      </div>
    </div>
  );
}
