import { rpc } from "@/lib/db";
import type { AdventureResponse, LevelView } from "@/lib/adventure/types";

type RawLevel = Omit<LevelView, "unlock_text">;

interface RawAdventure {
  world: { id: string; title: string; blurb: string };
  levels: RawLevel[];
  completed_count: number;
  total_count: number;
  world_complete: boolean;
  next_level_id: string | null;
}

/** What a locked level is waiting for, in plain words. */
export function unlockText(level: Pick<LevelView, "order_index" | "is_boss">, levelCount: number): string {
  if (level.is_boss) return `Finish all ${levelCount - 1} levels to unlock.`;
  return `Finish level ${level.order_index - 1} to unlock.`;
}

export function toAdventureResponse(raw: RawAdventure): AdventureResponse {
  return {
    ...raw,
    levels: raw.levels.map((l) => ({
      ...l,
      unlock_text: l.status === "locked" ? unlockText(l, raw.levels.length) : null,
    })),
  };
}

/** The whole map for a player. Every status comes from the database. */
export async function loadAdventure(userId: string): Promise<AdventureResponse> {
  const raw = await rpc<RawAdventure>("get_adventure", { p_user: userId, p_world: "syntax_valley" });
  return toAdventureResponse(raw);
}
