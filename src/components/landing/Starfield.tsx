"use client";

import { useMemo } from "react";

/** Deterministic PRNG so server and client render identical stars — avoids a hydration mismatch. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

function buildStars(seed: number, count: number): Star[] {
  const rand = mulberry32(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand() * 100,
      y: rand() * 100,
      size: rand() < 0.82 ? 1 : rand() < 0.95 ? 1.6 : 2.2,
      delay: rand() * 4,
      duration: 2.4 + rand() * 3,
    });
  }
  return stars;
}

/**
 * A plain-CSS twinkling starfield — no SVG filters, no blur — scoped to the
 * hero only. FlowingThreads already learned the hard way (crashed WebKit on
 * a real iPhone) that filtered-region compositing is expensive on mobile;
 * this stays deliberately cheap: absolutely positioned divs with an opacity
 * keyframe, nothing else.
 */
export function Starfield({ className }: { className?: string }) {
  const stars = useMemo(() => buildStars(41, 90), []);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          className="star-twinkle absolute rounded-full bg-foreground"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
