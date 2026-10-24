import { REWARDS } from "@/lib/progression/config";
import type { Difficulty } from "@/lib/types";

export interface QuestionScores {
  correctness: number;
  communication: number;
  reasoning: number;
}

const clampScore = (n: number) => (Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0);

export function averageScore(scores: QuestionScores): number {
  return (
    (clampScore(scores.correctness) + clampScore(scores.communication) + clampScore(scores.reasoning)) / 3
  );
}

/**
 * The reward for finishing one question. The inputs are the stored scores and
 * the stored difficulty, never anything the browser sent. The AI can move the
 * score, but the result is bounded by this formula either way.
 */
export function computeQuestionReward(input: {
  difficulty: Difficulty;
  scores: QuestionScores;
  isRepeatPosting: boolean;
}): { xp: number; coins: number } {
  const r = REWARDS.question;
  const avg = averageScore(input.scores);
  const difficultyBonus = r.difficultyBonusXp[input.difficulty] ?? 0;

  let xp = r.baseXp + difficultyBonus + Math.floor((avg / 100) * r.scoreBonusMaxXp);
  let coins = r.baseCoins + (avg >= r.highScoreThreshold ? r.highScoreCoinBonus : 0);

  if (input.isRepeatPosting) {
    xp = Math.max(1, Math.floor(xp * REWARDS.repeatPostingMultiplier));
    coins = Math.floor(coins * REWARDS.repeatPostingMultiplier);
  }
  return { xp, coins };
}
