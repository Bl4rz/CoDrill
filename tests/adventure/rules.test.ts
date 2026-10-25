import { describe, expect, it } from "vitest";
import { ADVENTURE, PHASES } from "@/lib/adventure/config";
import {
  bossHp,
  favored,
  isVictory,
  levelPassed,
  nextPhase,
  overallScore,
  passes,
  phaseDamage,
} from "@/lib/adventure/rules";

const all = (approach: number, code: number, defend: number) => ({ approach, code, defend });

describe("config is consistent", () => {
  it("the best case removes exactly all of the boss's HP", () => {
    const best = PHASES.map((p) => Math.max(...ADVENTURE.hpBands[p].map(([, c]) => c))).reduce((a, b) => a + b, 0);
    expect(best).toBe(ADVENTURE.bossHp);
  });

  it("weights add up to 1 and bands start at 0 and rise", () => {
    const w = PHASES.reduce((sum, p) => sum + ADVENTURE.phaseWeights[p], 0);
    expect(w).toBeCloseTo(1, 10);
    for (const p of PHASES) {
      const bands = ADVENTURE.hpBands[p];
      expect(bands[0][0]).toBe(0);
      for (let i = 1; i < bands.length; i++) {
        expect(bands[i][0]).toBeGreaterThan(bands[i - 1][0]);
        expect(bands[i][1]).toBeGreaterThan(bands[i - 1][1]);
      }
    }
  });

  it("replays are worth nothing by default", () => {
    expect(ADVENTURE.replayReward).toEqual({ xp: 0, coins: 0 });
  });
});

describe("pass threshold and the fairness margin", () => {
  it("states the margin: 57 passes, 56 does not (threshold 60, margin 3)", () => {
    expect(ADVENTURE.passThreshold).toBe(60);
    expect(ADVENTURE.fairnessMargin).toBe(3);
    expect(passes(56)).toBe(false);
    expect(passes(57)).toBe(true);
    expect(passes(60)).toBe(true);
    expect(passes(100)).toBe(true);
    expect(passes(0)).toBe(false);
  });

  it("never pushes a score past 100 or below 0", () => {
    expect(favored(100)).toBe(100);
    expect(favored(99)).toBe(100);
    expect(favored(-20)).toBe(3);
    expect(favored(Number.NaN)).toBe(3);
  });

  it("the overall score is the weighted mean of the stored phase scores", () => {
    expect(overallScore(all(100, 100, 100))).toBe(100);
    expect(overallScore(all(0, 0, 0))).toBe(0);
    // 0.3*60 + 0.4*50 + 0.3*40 = 18 + 20 + 12 = 50
    expect(overallScore(all(60, 50, 40))).toBe(50);
  });

  it("a level is passed right at the boundary of the weighted score", () => {
    // 0.3*57 + 0.4*57 + 0.3*57 = 57 -> passes with the margin
    expect(levelPassed(all(57, 57, 57))).toBe(true);
    expect(levelPassed(all(56, 56, 56))).toBe(false);
    // one strong phase can carry a weak one: 0.3*40 + 0.4*90 + 0.3*40 = 60
    expect(levelPassed(all(40, 90, 40))).toBe(true);
  });
});

describe("boss HP comes only from stored phase scores", () => {
  it("starts full and drops by band", () => {
    expect(bossHp({})).toBe(10);
    // approach 70 -> favored 73 -> 3 chunks
    expect(bossHp({ approach: 70 })).toBe(7);
    // code 80 -> 4 chunks
    expect(bossHp({ approach: 70, code: 80 })).toBe(3);
    expect(bossHp(all(70, 80, 70))).toBe(0);
  });

  it("band edges include the margin: 22 reaches the 25 band, 21 does not", () => {
    expect(phaseDamage("approach", 21)).toBe(0);
    expect(phaseDamage("approach", 22)).toBe(1);
    expect(phaseDamage("code", 71)).toBe(3);
    expect(phaseDamage("code", 72)).toBe(4);
    expect(phaseDamage("defend", 62)).toBe(3);
    expect(phaseDamage("defend", 61)).toBe(2);
  });

  it("is monotonic: a better score never leaves the boss with more HP", () => {
    for (const phase of PHASES) {
      let last = Infinity;
      for (let s = 0; s <= 100; s++) {
        const hp = bossHp({ [phase]: s });
        expect(hp).toBeLessThanOrEqual(last);
        last = hp;
      }
    }
  });

  it("never goes below zero", () => {
    expect(bossHp(all(100, 100, 100))).toBe(0);
  });

  it("junk scores are treated as safe numbers", () => {
    expect(phaseDamage("code", Number.NaN)).toBe(0);
    expect(phaseDamage("code", 99999)).toBe(4);
    expect(phaseDamage("code", -5)).toBe(0);
  });
});

describe("victory needs HP at zero and a passing overall score", () => {
  it("wins with strong scores", () => {
    expect(isVictory(all(70, 80, 70))).toBe(true);
  });

  it("does not win if any phase leaves HP on the boss, even with a passing average", () => {
    // approach 100, code 50, defend 100: overall 0.3*100 + 0.4*50 + 0.3*100 = 80 passes, but code only takes 2 chunks
    expect(levelPassed(all(100, 50, 100))).toBe(true);
    expect(bossHp(all(100, 50, 100))).toBe(2);
    expect(isVictory(all(100, 50, 100))).toBe(false);
  });

  it("does not win with weak scores", () => {
    expect(isVictory(all(30, 30, 30))).toBe(false);
  });
});

describe("phase order", () => {
  it("points at the first unscored phase", () => {
    expect(nextPhase([])).toBe("approach");
    expect(nextPhase(["approach"])).toBe("code");
    expect(nextPhase(["approach", "code"])).toBe("defend");
    expect(nextPhase(["approach", "code", "defend"])).toBeNull();
  });
});
