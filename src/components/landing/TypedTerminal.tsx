"use client";

import { useEffect, useState } from "react";

interface Line {
  speaker: "interviewer" | "you";
  text: string;
}

const SPEAKER_STYLES = {
  interviewer: { line: "text-muted", tag: "text-accent-green", label: "interviewer>" },
  you: { line: "text-foreground", tag: "text-accent-amber", label: "you>" },
} as const;

/**
 * A looping, typed-out recreation of the interview conversation — a live
 * preview of the product built from real markup, not a screen recording.
 * Runs on setTimeout (not requestAnimationFrame) so it keeps making progress
 * even in contexts that throttle rAF.
 */
export function TypedTerminal({ lines, label }: { lines: Line[]; label: string }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (visibleCount >= lines.length) {
      const resetTimer = setTimeout(() => {
        setVisibleCount(0);
        setCharIndex(0);
      }, 2800);
      return () => clearTimeout(resetTimer);
    }
    const current = lines[visibleCount].text;
    if (charIndex < current.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 22);
      return () => clearTimeout(t);
    }
    const pause = setTimeout(() => {
      setVisibleCount((v) => v + 1);
      setCharIndex(0);
    }, 650);
    return () => clearTimeout(pause);
  }, [visibleCount, charIndex, lines]);

  const current = visibleCount < lines.length ? lines[visibleCount] : null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface text-left shadow-[0_0_60px_-15px_var(--accent-green)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-raised px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-accent-red/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent-yellow/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent-green/60" />
        <span className="ml-2 font-mono text-[11px] text-muted">{label}</span>
      </div>
      <div className="flex min-h-[168px] flex-col gap-3 p-5 font-mono text-[13px] leading-relaxed">
        {lines.slice(0, visibleCount).map((line, i) => {
          const s = SPEAKER_STYLES[line.speaker];
          return (
            <p key={i} className={s.line}>
              <span className={s.tag}>{s.label}</span> {line.text}
            </p>
          );
        })}
        {current && (
          <p className={SPEAKER_STYLES[current.speaker].line}>
            <span className={SPEAKER_STYLES[current.speaker].tag}>
              {SPEAKER_STYLES[current.speaker].label}
            </span>{" "}
            {current.text.slice(0, charIndex)}
            <span className="text-accent-amber">▊</span>
          </p>
        )}
      </div>
    </div>
  );
}
