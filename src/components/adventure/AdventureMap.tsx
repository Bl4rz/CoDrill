"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { MapNode } from "@/components/adventure/MapNode";
import { LevelDialog } from "@/components/adventure/LevelDialog";
import type { AdventureResponse, LevelView } from "@/lib/adventure/types";
import { art } from "@/lib/art";

/**
 * The world map: a baked pixel backdrop (the same meadow, sand path and tower as the title
 * screen) with a real button on each stop. Nodes sit where the path was drawn, in art pixels;
 * everything scales by a whole number (--k) so the path stays under the nodes. Every node's
 * state is whatever the server said.
 */
export function AdventureMap({ data }: { data: AdventureResponse }) {
  const [selected, setSelected] = useState<LevelView | null>(null);
  const map = art.map;

  // "Continue Adventure" links here with ?level=<id> to open that level's dialog.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("level");
    const match = data.levels.find((l) => l.id === wanted);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the query string once on mount
    if (match) setSelected(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <section
        aria-label="World map"
        className="relative left-1/2 -translate-x-1/2 shadow-[0_0_0_3px_var(--line)] [--k:3] sm:[--k:4]"
        style={{ width: `calc(var(--k) * ${map.w}px)`, height: `calc(var(--k) * ${map.h}px)` } as CSSProperties}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled by the image optimizer */}
        <img className="px absolute inset-0 h-full w-full" src={map.src} alt="" width={map.w} height={map.h} decoding="async" />
        {data.levels.map((level, i) => {
          const at = map.nodes[i] ?? map.nodes[map.nodes.length - 1];
          return (
            <div
              key={level.id}
              className="absolute"
              style={{
                left: `calc(var(--k) * ${at.x}px)`,
                top: `calc(var(--k) * ${at.y}px)`,
                transform: `translate(-50%, calc(var(--k) * ${level.is_boss ? -12 : -9}px))`,
              }}
            >
              <MapNode level={level} onSelect={setSelected} />
            </div>
          );
        })}
      </section>
      {selected && <LevelDialog level={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
