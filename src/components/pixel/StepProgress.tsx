"use client";

import { useEffect, useState } from "react";

/**
 * A loading bar that fills one chunk at a time, with plain messages that
 * rotate as it goes. It can't know how long the model takes, so it climbs
 * toward the end and parks one chunk short until the caller unmounts it.
 */
export function StepProgress({
  messages,
  chunks = 12,
  stepMs = 650,
}: {
  messages: string[];
  chunks?: number;
  stepMs?: number;
}) {
  const [step, setStep] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? Math.floor(chunks / 2)
      : 0,
  );
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, chunks - 1)), stepMs);
    return () => clearInterval(id);
  }, [chunks, stepMs, reduced]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!reduced) return;
    const id = setInterval(() => setTick((t) => t + 1), 2800);
    return () => clearInterval(id);
  }, [reduced]);

  const messageIndex = reduced
    ? tick % messages.length
    : Math.min(messages.length - 1, Math.floor((step / chunks) * messages.length));

  return (
    <div className="flex w-full max-w-md flex-col gap-3" aria-busy="true">
      <p role="status" aria-live="polite" className="font-display text-base uppercase tracking-widest">
        {messages[messageIndex]}
      </p>
      <div className="flex gap-[3px] border-[3px] border-paper p-[3px]">
        {Array.from({ length: chunks }).map((_, i) => (
          <div
            key={i}
            className="h-4 flex-1"
            style={{ background: i <= step ? "var(--green)" : "var(--ink)" }}
          />
        ))}
      </div>
    </div>
  );
}
