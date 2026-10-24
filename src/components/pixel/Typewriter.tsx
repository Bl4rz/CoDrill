"use client";

import { useEffect, useRef, useState } from "react";

const TICK_MS = 28;
const CHARS_PER_TICK = 2;

/**
 * Types text out in fast hard steps. Click it to skip to the end. The full
 * text is always present for screen readers; reduced-motion users get it
 * instantly. `onDone` fires once, whether it finished or was skipped.
 */
export function Typewriter({
  text,
  onDone,
  className,
}: {
  text: string;
  onDone?: () => void;
  className?: string;
}) {
  const [count, setCount] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? text.length
      : 0,
  );
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (count >= text.length) return;
    const id = setInterval(() => setCount((c) => Math.min(text.length, c + CHARS_PER_TICK)), TICK_MS);
    return () => clearInterval(id);
  }, [count, text.length]);

  useEffect(() => {
    if (count >= text.length && !doneRef.current) {
      doneRef.current = true;
      onDoneRef.current?.();
    }
  }, [count, text.length]);

  const finished = count >= text.length;
  return (
    <p
      className={className}
      onClick={finished ? undefined : () => setCount(text.length)}
      title={finished ? undefined : "Click to skip"}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, count)}
        {!finished && <span className="blink-cursor">_</span>}
      </span>
    </p>
  );
}
