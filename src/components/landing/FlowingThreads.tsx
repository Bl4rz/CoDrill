"use client";

import { useEffect, useMemo, useRef } from "react";

const PARALLAX_FACTOR = 0.12;
const PARALLAX_MAX = 120;

/**
 * Deterministic PRNG (not Math.random) so the generated paths are identical
 * on server and client render — avoids a hydration mismatch.
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 1600;
const H = 900;

interface Thread {
  d: string;
  width: number;
  opacity: number;
}

function buildBand(seed: number, baseY: number, count: number): Thread[] {
  const rand = mulberry32(seed);
  const lines: Thread[] = [];
  for (let i = 0; i < count; i++) {
    const y0 = baseY + (rand() - 0.5) * 150;
    const amp1 = 70 + rand() * 100;
    const amp2 = 40 + rand() * 80;
    const y1 = y0 - amp1 + (rand() - 0.5) * 30;
    const y2 = y0 + amp2 * 0.4 + (rand() - 0.5) * 30;
    const y3 = y0 - amp2 + (rand() - 0.5) * 40;
    const yEnd = y0 + (rand() - 0.5) * 40;
    const d = `M -100 ${y0.toFixed(1)} C ${W * 0.28} ${y1.toFixed(1)}, ${W * 0.42} ${y2.toFixed(
      1,
    )}, ${W * 0.6} ${y3.toFixed(1)} S ${W * 0.9} ${(y0 - 20).toFixed(1)}, ${W + 100} ${yEnd.toFixed(1)}`;
    lines.push({ d, width: 0.6 + rand() * 1.6, opacity: 0.1 + rand() * 0.5 });
  }
  return lines;
}

/**
 * A silky flowing-thread background (green ribbon with a golden highlight
 * running through it) — a hand-built SVG recreation of the cluely-style
 * abstract hero art, not an imported image, so it stays theme-tinted and
 * dependency-free.
 *
 * Renders two versions. `.bg-heavy` (this SVG, ~100 gradient-stroked paths
 * plus two feGaussianBlur-filtered ellipses) crashed WebKit's renderer on a
 * real iPhone in testing — too much filtered-region compositing for mobile
 * Safari/Chrome. `.bg-light` is a plain CSS gradient with no SVG and no
 * filters at all. Which one paints is decided purely by the CSS media query
 * in globals.css (`.bg-heavy`/`.bg-light`), not JS, so there's no hydration
 * window where the heavy version could render even briefly on a phone.
 */
export function FlowingThreads() {
  const bandA = useMemo(() => buildBand(7, H * 0.34, 48), []);
  const bandB = useMemo(() => buildBand(19, H * 0.68, 48), []);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;

    // Even though .bg-heavy is display:none on these devices via CSS, skip
    // attaching the scroll listener too — no point paying for it on a layer
    // that's never painted.
    const lightweight =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    if (lightweight) return;

    let ticking = false;
    const apply = () => {
      const offset = Math.max(
        -PARALLAX_MAX,
        Math.min(PARALLAX_MAX, window.scrollY * PARALLAX_FACTOR),
      );
      el.style.transform = `translate3d(0, ${offset}px, 0)`;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div
        ref={layerRef}
        className="bg-heavy absolute inset-x-0 will-change-transform"
        style={{ top: -PARALLAX_MAX, bottom: -PARALLAX_MAX, filter: "blur(6px)" }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="thread-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-green)" stopOpacity="0.12" />
              <stop offset="36%" stopColor="var(--accent-amber)" stopOpacity="0.85" />
              <stop offset="52%" stopColor="var(--accent-amber-soft)" stopOpacity="0.95" />
              <stop offset="72%" stopColor="var(--accent-green-soft)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--accent-green)" stopOpacity="0.1" />
            </linearGradient>
            <filter id="thread-soften" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="36" />
            </filter>
          </defs>

          <g transform={`rotate(-6 ${W / 2} ${H / 2})`}>
            <ellipse
              cx={W * 0.5}
              cy={H * 0.34}
              rx={W * 0.58}
              ry={140}
              fill="var(--accent-green)"
              opacity={0.2}
              filter="url(#thread-soften)"
            />
            {bandA.map((l, i) => (
              <path
                key={`a${i}`}
                d={l.d}
                stroke="url(#thread-grad)"
                strokeWidth={l.width}
                fill="none"
                opacity={l.opacity}
                strokeLinecap="round"
              />
            ))}
          </g>

          <g transform={`rotate(-11 ${W / 2} ${H / 2})`}>
            <ellipse
              cx={W * 0.5}
              cy={H * 0.68}
              rx={W * 0.58}
              ry={140}
              fill="var(--accent-green)"
              opacity={0.16}
              filter="url(#thread-soften)"
            />
            {bandB.map((l, i) => (
              <path
                key={`b${i}`}
                d={l.d}
                stroke="url(#thread-grad)"
                strokeWidth={l.width}
                fill="none"
                opacity={l.opacity}
                strokeLinecap="round"
              />
            ))}
          </g>
        </svg>
      </div>

      <div
        className="bg-light absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 20% 25%, color-mix(in srgb, var(--accent-green) 30%, transparent) 0%, transparent 70%)," +
            "radial-gradient(ellipse 65% 40% at 80% 70%, color-mix(in srgb, var(--accent-amber) 26%, transparent) 0%, transparent 70%)," +
            "var(--background)",
        }}
      />
    </>
  );
}
