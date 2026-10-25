import { CheckIcon, LockIcon, ArrowIcon } from "@/components/pixel/icons";
import { GoblinSprite } from "@/components/pixel/GoblinSprite";
import type { LevelView } from "@/lib/adventure/types";

const BOX = "flex shrink-0 items-center justify-center border-[3px]";

/** One stop on the map. Its look comes from the server-computed status, and it is always a real button. */
export function MapNode({ level, onSelect }: { level: LevelView; onSelect: (level: LevelView) => void }) {
  const { status, is_boss: boss } = level;
  const size = boss ? "h-24 w-24" : "h-[72px] w-[72px]";

  const style =
    status === "completed"
      ? "border-green bg-green text-ink"
      : status === "unlocked"
        ? `node-blink border-amber bg-ink ${boss ? "text-red" : "text-amber"}`
        : "border-dashed border-paper bg-ink text-paper";

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
      className="group flex w-32 flex-col items-center gap-2 text-center focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-amber"
    >
      <span className={`${BOX} ${size} ${style} ${boss && status !== "completed" ? "border-red" : ""}`}>
        {boss ? (
          status === "locked" ? (
            <span className="text-paper">
              <LockIcon unit="4px" />
            </span>
          ) : (
            <GoblinSprite state={status === "completed" ? "defeated" : "idle"} crop="head" unit="5px" title="" />
          )
        ) : status === "completed" ? (
          <CheckIcon unit="5px" />
        ) : status === "unlocked" ? (
          <span className="flex flex-col items-center gap-1">
            <span className="font-display text-2xl leading-none">{level.order_index}</span>
            <ArrowIcon unit="2px" />
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1">
            <span className="font-display text-lg leading-none">{level.order_index}</span>
            <LockIcon unit="2px" />
          </span>
        )}
      </span>
      <span className="font-display text-xs uppercase leading-tight tracking-widest group-hover:text-amber">
        {level.title}
      </span>
      <span className="text-xs leading-snug">
        {status === "completed" && (
          <span className="text-green">
            {level.best_overall !== null ? `Best ${level.best_overall}` : "Done"} · Replay
          </span>
        )}
        {status === "unlocked" && <span className="text-amber">{boss ? "Ready to fight" : "Ready"}</span>}
        {status === "locked" && level.unlock_text}
      </span>
    </button>
  );
}
