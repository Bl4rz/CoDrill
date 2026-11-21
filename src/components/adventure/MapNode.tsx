import type { CSSProperties } from "react";
import { CheckIcon, LockIcon } from "@/components/pixel/icons";
import { GoblinSprite } from "@/components/pixel/GoblinSprite";
import type { LevelView } from "@/lib/adventure/types";

/**
 * One stop on the map. Its look comes from the server-computed status, and it is always a real
 * button. Sizes are whole multiples of the map's art pixel (--k): 18 for a level, 24 for the boss.
 */
export function MapNode({ level, onSelect }: { level: LevelView; onSelect: (level: LevelView) => void }) {
  const { status, is_boss: boss } = level;
  const side = boss ? 24 : 18;

  const tone =
    status === "completed"
      ? "tone-green"
      : status === "unlocked"
        ? boss
          ? "tone-red"
          : ""
        : "map-locked";

  const label = boss ? "Boss" : `Level ${level.order_index}`;
  const stateText =
    status === "completed"
      ? "completed"
      : status === "unlocked"
        ? "ready to play"
        : `locked. ${level.unlock_text ?? ""}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(level)}
      aria-label={`${label}: ${level.title}, ${stateText}`}
      className="group flex w-36 flex-col items-center gap-2 text-center"
    >
      <span className="relative inline-flex [filter:drop-shadow(4px_4px_0_var(--shade))] group-active:[filter:drop-shadow(1px_1px_0_var(--shade))]">
        {status === "unlocked" && <span className="map-pointer" aria-hidden="true" />}
        <span
          className={`grade-box notch ${tone} flex items-center justify-center group-active:translate-x-[3px] group-active:translate-y-[3px] [--n:4px] ${boss ? "[--n:6px]" : ""}`}
          style={{ width: `calc(var(--k) * ${side}px)`, height: `calc(var(--k) * ${side}px)` } as CSSProperties}
        >
          {boss ? (
            status === "locked" ? (
              <LockIcon unit="4px" />
            ) : (
              <GoblinSprite state={status === "completed" ? "defeated" : "idle"} crop="head" k={1} title="" />
            )
          ) : status === "completed" ? (
            <CheckIcon unit="5px" />
          ) : status === "unlocked" ? (
            <span className="font-display text-3xl font-bold leading-none">{level.order_index}</span>
          ) : (
            <span className="flex flex-col items-center gap-1">
              <span className="font-display text-lg font-bold leading-none">{level.order_index}</span>
              <LockIcon unit="2px" />
            </span>
          )}
        </span>
      </span>
      <span className="notch flex w-full flex-col gap-0.5 bg-ink/90 px-2 py-1.5 [--n:3px]">
        <span className="font-display text-xs font-medium uppercase leading-tight tracking-widest group-hover:text-amber">
          {level.title}
        </span>
        <span className="text-xs leading-snug text-mute">
          {status === "completed" && (
            <span className="text-green">
              {level.best_overall !== null ? `Best ${level.best_overall}` : "Done"} · Replay
            </span>
          )}
          {status === "unlocked" && <span className="text-amber">{boss ? "Ready to fight" : "Ready"}</span>}
          {status === "locked" && level.unlock_text}
        </span>
      </span>
    </button>
  );
}
