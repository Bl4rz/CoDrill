"use client";

import { useEffect, useState } from "react";
import { scoreColor, scoreTone } from "@/lib/grade";
import { playBlip } from "@/lib/sound";

const SEGMENTS = 10;
const STEP_MS = 80;

/**
 * Ten-chunk score meter. With `animate`, chunks fill one at a time in hard
 * steps (and blip once per bar when sound is on); otherwise it just renders
 * full. Reduced-motion users always get the final state.
 */
export function SegmentBar({
  label,
  value,
  animate = false,
  delay = 0,
}: {
  label: string;
  value: number;
  animate?: boolean;
  delay?: number;
}) {
  const target = Math.round((Math.max(0, Math.min(100, value)) / 100) * SEGMENTS);
  const [shown, setShown] = useState(animate ? 0 : target);

  useEffect(() => {
    if (!animate) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a client-only media query on mount
      setShown(target);
      return;
    }
    let step = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        step += 1;
        setShown(step);
        if (step >= target) {
          clearInterval(interval);
          playBlip("score");
        }
      }, STEP_MS);
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [animate, delay, target]);

  const color = scoreColor(value);
  const tone = scoreTone(value);
  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-baseline justify-between font-display uppercase tracking-widest">
        <span className="text-sm">{label}</span>
        <span className="text-base" style={{ color }}>
          {Math.round(value)}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        className="flex gap-1"
      >
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <i key={i} className={`chunk${i < shown ? ` on chunk-${tone}` : ""}`} />
        ))}
      </div>
    </div>
  );
}
