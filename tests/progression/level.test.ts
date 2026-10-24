import { describe, expect, it } from "vitest";
import { LEVEL } from "@/lib/progression/config";
import { levelForXp, levelProgress, xpForLevel, xpToNext } from "@/lib/progression/level";

describe("level curve", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelForXp(0)).toBe(1);
    expect(xpForLevel(1)).toBe(0);
  });

  it("level 1 -> 2 costs 100 and each level costs 25 more than the last", () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(2)).toBe(125);
    expect(xpToNext(3)).toBe(150);
  });

  it("levels up exactly on the boundary, not before", () => {
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(224)).toBe(2);
    expect(levelForXp(225)).toBe(3);
    expect(levelForXp(374)).toBe(3);
    expect(levelForXp(375)).toBe(4);
  });

  it("matches the documented totals: level 5 at 550 XP, level 10 at 1,800 XP", () => {
    expect(xpForLevel(5)).toBe(550);
    expect(xpForLevel(10)).toBe(1800);
    expect(levelForXp(549)).toBe(4);
    expect(levelForXp(550)).toBe(5);
  });

  it("is consistent with xpForLevel at every level boundary", () => {
    for (let level = 1; level <= LEVEL.maxLevel; level++) {
      const start = xpForLevel(level);
      expect(levelForXp(start)).toBe(level);
      if (level > 1) expect(levelForXp(start - 1)).toBe(level - 1);
    }
  });

  it("never goes down as XP goes up", () => {
    let last = 1;
    for (let xp = 0; xp <= 20000; xp += 7) {
      const level = levelForXp(xp);
      expect(level).toBeGreaterThanOrEqual(last);
      last = level;
    }
  });

  it("caps at the max level", () => {
    expect(levelForXp(xpForLevel(LEVEL.maxLevel))).toBe(LEVEL.maxLevel);
    expect(levelForXp(10_000_000)).toBe(LEVEL.maxLevel);
  });

  it("treats negative, fractional and non-finite XP safely", () => {
    expect(levelForXp(-50)).toBe(1);
    expect(levelForXp(Number.NaN)).toBe(1);
    expect(levelForXp(Number.POSITIVE_INFINITY)).toBe(1);
    expect(levelForXp(100.9)).toBe(2);
  });

  it("reports progress inside the current level", () => {
    expect(levelProgress(0)).toEqual({ level: 1, current: 0, needed: 100, isMax: false });
    expect(levelProgress(130)).toEqual({ level: 2, current: 30, needed: 125, isMax: false });
    expect(levelProgress(99)).toEqual({ level: 1, current: 99, needed: 100, isMax: false });
    expect(levelProgress(10_000_000).isMax).toBe(true);
  });
});
