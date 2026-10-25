"use client";

import type { LevelDifficulty } from "@/lib/adventure/types";
import { DifficultyTag } from "@/components/adventure/DifficultyTag";
import { GoblinSprite, type GoblinState } from "@/components/pixel/GoblinSprite";
import { shadowColor } from "@/components/pixel/style";

export interface DamagePop {
  amount: number;
  /** Changes for every new hit, so the animation restarts */
  key: number;
}

/** Ten-chunk HP bar. Chunks left come from the server; this only draws them. */
export function HpBar({ hp, total }: { hp: number; total: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between font-display uppercase tracking-widest">
        <span className="text-sm">HP</span>
        <span className="text-base text-red">
          {hp}/{total}
        </span>
      </div>
      <div
        role="meter"
        aria-label="Boss HP"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={hp}
        aria-valuetext={`${hp} of ${total} chunks left`}
        className="flex gap-[3px]"
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="h-5 flex-1 border-2 border-paper"
            style={{ background: i < hp ? "var(--red)" : "var(--ink)" }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The boss at the top of a boss battle: sprite, name, difficulty and HP. When a
 * phase is scored the sprite shakes in hard steps and a damage number rises in
 * three steps. Both are cosmetic; the HP itself is whatever the server stored.
 */
export function BossArena({
  name,
  hp,
  total,
  state,
  difficulty,
  damage,
}: {
  name: string;
  hp: number;
  total: number;
  state: GoblinState;
  difficulty: LevelDifficulty;
  damage: DamagePop | null;
}) {
  return (
    <section
      aria-label={`Boss: ${name}`}
      className="pixel-panel flex flex-wrap items-center gap-x-6 gap-y-4 border-red bg-ink p-4"
      style={shadowColor("var(--red)")}
    >
      <div className="relative mx-auto shrink-0 sm:mx-0">
        <div className={state === "hit" ? "boss-shake" : undefined}>
          <GoblinSprite state={state} unit="var(--u)" scale={1.5} />
        </div>
        {damage && (
          <span
            key={damage.key}
            aria-hidden="true"
            className="damage-rise pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 bg-ink px-1 font-display text-2xl uppercase tracking-widest text-amber"
          >
            {damage.amount > 0 ? `-${damage.amount}` : "MISS"}
          </span>
        )}
      </div>
      <div className="flex min-w-[220px] flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="pixel-heading text-xl sm:text-2xl">{name}</h2>
          <DifficultyTag difficulty={difficulty} />
        </div>
        <HpBar hp={hp} total={total} />
      </div>
    </section>
  );
}
