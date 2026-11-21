import type { PlayerSummary } from "@/lib/progression/types";

const SEGMENTS = 10;

/** Ten-chunk XP bar with the plain numbers underneath. Chunks fill only for XP actually earned. */
export function XpBar({ player }: { player: Pick<PlayerSummary, "xp_in_level" | "xp_needed" | "is_max"> }) {
  const filled = player.is_max
    ? SEGMENTS
    : Math.min(SEGMENTS - 1, Math.floor((player.xp_in_level / Math.max(1, player.xp_needed)) * SEGMENTS));
  return (
    <div className="flex w-full flex-col gap-1.5">
      <div
        role="meter"
        aria-label="XP to next level"
        aria-valuemin={0}
        aria-valuemax={player.is_max ? 1 : player.xp_needed}
        aria-valuenow={player.is_max ? 1 : player.xp_in_level}
        className="flex gap-1"
      >
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <i key={i} className={`chunk${i < filled ? " on chunk-green" : ""}`} />
        ))}
      </div>
      <p className="font-display text-sm uppercase tracking-widest">
        {player.is_max ? "Max level" : `${player.xp_in_level} / ${player.xp_needed} XP to next level`}
      </p>
    </div>
  );
}
