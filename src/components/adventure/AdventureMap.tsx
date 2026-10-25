"use client";

import { useEffect, useState } from "react";
import { MapNode } from "@/components/adventure/MapNode";
import { LevelDialog } from "@/components/adventure/LevelDialog";
import type { AdventureResponse, LevelView } from "@/lib/adventure/types";

// Node centers: x as a percent of the map's width, y in pixels from the top. The path
// winds left and right down the page, so it is one vertical column at any width.
const X = [24, 72, 28, 72, 26, 50];
const ROW = 168;
const TOP = 56;
const centerY = (i: number, boss: boolean) => TOP + i * ROW + (boss ? 12 : 0);

function PathDots({ levels }: { levels: LevelView[] }) {
  const dots: { x: number; y: number; done: boolean }[] = [];
  for (let i = 0; i < levels.length - 1; i++) {
    const [x1, y1] = [X[i] ?? 50, centerY(i, levels[i].is_boss)];
    const [x2, y2] = [X[i + 1] ?? 50, centerY(i + 1, levels[i + 1].is_boss)];
    const steps = 12;
    // leave room around each node so the dots don't run under it
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      dots.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, done: levels[i].status === "completed" });
    }
  }
  // Keep dots off the nodes and their labels (box plus a line or two of text underneath).
  const visible = dots.filter(
    (d) => !levels.some((l, j) => Math.abs(d.x - (X[j] ?? 50)) < 19 && d.y > centerY(j, l.is_boss) - 52 && d.y < centerY(j, l.is_boss) + 96),
  );
  return (
    <>
      {visible.map((d, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute h-2 w-2"
          style={{ left: `calc(${d.x}% - 4px)`, top: d.y - 4, background: d.done ? "var(--green)" : "var(--paper)" }}
        />
      ))}
    </>
  );
}

/** The six-node path. Every node's state is whatever the server said. */
export function AdventureMap({ data }: { data: AdventureResponse }) {
  const [selected, setSelected] = useState<LevelView | null>(null);

  // "Continue Adventure" links here with ?level=<id> to open that level's dialog.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("level");
    const match = data.levels.find((l) => l.id === wanted);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the query string once on mount
    if (match) setSelected(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const height = centerY(data.levels.length - 1, true) + 120;
  return (
    <>
      <section aria-label="World map" className="relative mx-auto w-full max-w-md" style={{ height }}>
        <PathDots levels={data.levels} />
        {data.levels.map((level, i) => (
          <div
            key={level.id}
            className="absolute"
            style={{ left: `${X[i] ?? 50}%`, top: centerY(i, level.is_boss) - (level.is_boss ? 48 : 36), transform: "translateX(-50%)" }}
          >
            <MapNode level={level} onSelect={setSelected} />
          </div>
        ))}
      </section>
      {selected && <LevelDialog level={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
