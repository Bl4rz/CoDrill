import type { CSSProperties } from "react";
import { art } from "@/lib/art";

export type GoblinState = "idle" | "hit" | "angry" | "defeated";

// Frame order in the baked sheet: idle0 idle1 hit angry0 angry1 defeated.
const FRAMES: Record<GoblinState, { from: number; to: number }> = {
  idle: { from: 0, to: 2 },
  hit: { from: 2, to: 2 },
  angry: { from: 3, to: 5 },
  defeated: { from: 5, to: 5 },
};

// The head crop: ears and face, without the body.
const HEAD = { top: 8, height: 34 };

/**
 * The Debug Goblin from the baked sheet. Idle and angry are two-frame loops;
 * hit is a white flash frame; defeated is slumped with X eyes. `k` is the
 * size of one art pixel in CSS pixels (a whole number).
 */
export function GoblinSprite({
  state = "idle",
  crop = "full",
  k,
  className,
  title = "The Debug Goblin, a small red pixel monster",
}: {
  state?: GoblinState;
  crop?: "full" | "head";
  k?: number;
  className?: string;
  title?: string;
}) {
  const g = art.goblin;
  const f = FRAMES[state];
  const animated = f.to - f.from > 1;
  const head = crop === "head";
  const style = {
    ...(k ? { "--k": k } : null),
    "--fw": g.fw,
    "--a": f.from,
    "--b": f.to,
    width: `calc(var(--k, 3) * ${g.fw}px)`,
    height: `calc(var(--k, 3) * ${head ? HEAD.height : g.fh}px)`,
  } as CSSProperties;
  return (
    <span
      className={`sprite-box ${className ?? ""}`}
      style={style}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled by the image optimizer */}
      <img
        className={animated ? "sprite-strip goblin-loop" : "sprite-strip"}
        src={g.src}
        alt=""
        width={g.w}
        height={g.h}
        decoding="async"
        style={{
          width: `calc(var(--k, 3) * ${g.w}px)`,
          height: `calc(var(--k, 3) * ${g.h}px)`,
          marginTop: head ? `calc(var(--k, 3) * ${-HEAD.top}px)` : undefined,
          transform: animated ? undefined : `translateX(calc(var(--k, 3) * var(--fw) * var(--a) * -1px))`,
        }}
      />
    </span>
  );
}

/** The goblin standing in its arena: night sky, moon, grass. 96x72 art pixels. */
export function GoblinScene({
  state = "idle",
  k,
  className,
}: {
  state?: GoblinState;
  k?: number;
  className?: string;
}) {
  const g = art.goblin;
  return (
    <span
      className={`relative block overflow-hidden ${className ?? ""}`}
      style={{
        ...(k ? ({ "--k": k } as CSSProperties) : null),
        width: `calc(var(--k, 4) * ${g.arenaW}px)`,
        height: `calc(var(--k, 4) * ${g.arenaH}px)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled by the image optimizer */}
      <img
        className="px absolute inset-0 h-full w-full"
        src={g.arena.src}
        alt=""
        width={g.arenaW}
        height={g.arenaH}
        decoding="async"
      />
      <span
        className="absolute"
        style={{
          left: `calc(var(--k, 4) * ${g.at.x}px)`,
          top: `calc(var(--k, 4) * ${g.at.y}px)`,
        }}
      >
        <GoblinSprite state={state} />
      </span>
    </span>
  );
}
