import { describe, expect, it } from "vitest";
import { REWARDS } from "@/lib/progression/config";
import { averageScore, computeQuestionReward } from "@/lib/progression/rewards";

const scores = (c: number, m: number, r: number) => ({ correctness: c, communication: m, reasoning: r });

describe("question reward formula", () => {
  it("pays the base for a zero-score easy question", () => {
    expect(computeQuestionReward({ difficulty: "easy", scores: scores(0, 0, 0), isRepeatPosting: false })).toEqual({
      xp: 20,
      coins: 5,
    });
  });

  it("adds a difficulty bonus and a score bonus", () => {
    // medium: 20 + 5; avg 60 -> floor(0.6 * 15) = 9 bonus; avg < 80 so no coin bonus
    expect(computeQuestionReward({ difficulty: "medium", scores: scores(60, 60, 60), isRepeatPosting: false })).toEqual({
      xp: 34,
      coins: 5,
    });
  });

  it("caps at 45 XP and 10 coins no matter how high the scores are", () => {
    const max = computeQuestionReward({ difficulty: "hard", scores: scores(100, 100, 100), isRepeatPosting: false });
    expect(max).toEqual({ xp: 45, coins: 10 });
    const absurd = computeQuestionReward({
      difficulty: "hard",
      scores: scores(9999, 1e9, Number.POSITIVE_INFINITY),
      isRepeatPosting: false,
    });
    expect(absurd.xp).toBeLessThanOrEqual(45);
    expect(absurd.coins).toBeLessThanOrEqual(10);
  });

  it("never goes below the base for junk scores", () => {
    const junk = computeQuestionReward({
      difficulty: "easy",
      scores: scores(-50, Number.NaN, -1),
      isRepeatPosting: false,
    });
    expect(junk).toEqual({ xp: 20, coins: 5 });
  });

  it("gives the coin bonus only at the high-score threshold", () => {
    expect(computeQuestionReward({ difficulty: "easy", scores: scores(79, 79, 80), isRepeatPosting: false }).coins).toBe(5);
    expect(computeQuestionReward({ difficulty: "easy", scores: scores(80, 80, 80), isRepeatPosting: false }).coins).toBe(10);
  });

  it("pays 25% (rounded down, at least 1 XP) when the posting was already run", () => {
    const full = computeQuestionReward({ difficulty: "hard", scores: scores(100, 100, 100), isRepeatPosting: false });
    const repeat = computeQuestionReward({ difficulty: "hard", scores: scores(100, 100, 100), isRepeatPosting: true });
    expect(repeat.xp).toBe(Math.floor(full.xp * REWARDS.repeatPostingMultiplier));
    expect(repeat.xp).toBeGreaterThanOrEqual(1);
    expect(repeat.coins).toBe(2);
  });

  it("stays inside the sanity ceilings the database enforces", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const r = computeQuestionReward({ difficulty, scores: scores(100, 100, 100), isRepeatPosting: false });
      expect(r.xp).toBeLessThanOrEqual(REWARDS.maxXpPerGrant);
      expect(r.coins).toBeLessThanOrEqual(REWARDS.maxCoinsPerGrant);
    }
  });

  it("averages the three axes, clamped to 0-100", () => {
    expect(averageScore(scores(100, 50, 0))).toBe(50);
    expect(averageScore(scores(500, 500, 500))).toBe(100);
  });
});
