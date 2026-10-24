import { LEVEL } from "@/lib/progression/config";

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return LEVEL.baseXp + LEVEL.stepXp * (level - 1);
}

/** Total XP needed to reach `level` from zero. Level 1 is 0. */
export function xpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < Math.min(level, LEVEL.maxLevel); l++) total += xpToNext(l);
  return total;
}

/** The one place level is computed from XP. Negative or non-finite XP counts as 0. */
export function levelForXp(totalXp: number): number {
  let remaining = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  let level = 1;
  while (level < LEVEL.maxLevel) {
    const need = xpToNext(level);
    if (remaining < need) break;
    remaining -= need;
    level += 1;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP earned inside the current level */
  current: number;
  /** XP the current level needs in total (0 at the max level) */
  needed: number;
  isMax: boolean;
}

export function levelProgress(totalXp: number): LevelProgress {
  const level = levelForXp(totalXp);
  if (level >= LEVEL.maxLevel) return { level, current: 0, needed: 0, isMax: true };
  const xp = Math.max(0, Math.floor(totalXp));
  return { level, current: xp - xpForLevel(level), needed: xpToNext(level), isMax: false };
}
