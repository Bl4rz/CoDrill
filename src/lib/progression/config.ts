import type { CodeLanguage, Difficulty } from "@/lib/types";

/**
 * Every tunable number for progression lives in this file. The level curve is
 * mirrored in SQL (public.level_for_xp in supabase/migrations/...player_progression.sql);
 * a test compares the two for every XP value that matters, so change both together.
 */

/**
 * LEVEL CURVE
 * XP needed to go from level n to level n+1 is  baseXp + stepXp * (n - 1).
 * Level 1 -> 2 costs 100, 2 -> 3 costs 125, 3 -> 4 costs 150, and so on. A
 * level 5 player has earned 550 XP total; level 10 needs 1,800; the cap is 50.
 * Early levels come quickly, then each one asks for a little more.
 */
export const LEVEL = { baseXp: 100, stepXp: 25, maxLevel: 50 } as const;

/**
 * QUESTION REWARDS (granted once per question, decided by the server)
 *   xp    = baseXp + difficultyBonusXp[difficulty] + floor(avgScore / 100 * scoreBonusMaxXp)
 *   coins = baseCoins + (avgScore >= highScoreThreshold ? highScoreCoinBonus : 0)
 * avgScore is the mean of the stored correctness, communication and reasoning
 * scores. The most one question can pay is 45 XP and 10 coins.
 *
 * REPEAT RULE: the first run of a posting pays in full. Any later run of the
 * same posting (same role, stack and focus areas) pays 25% (rounded down, at
 * least 1 XP). Replaying the exact same question never pays at all: each
 * question pays once, ever.
 */
export const REWARDS = {
  question: {
    baseXp: 20,
    difficultyBonusXp: { easy: 0, medium: 5, hard: 10 } satisfies Record<Difficulty, number>,
    scoreBonusMaxXp: 15,
    baseCoins: 5,
    highScoreCoinBonus: 5,
    highScoreThreshold: 80,
  },
  repeatPostingMultiplier: 0.25,
  // Sanity ceilings. The SQL grant function refuses anything above these.
  maxXpPerGrant: 200,
  maxCoinsPerGrant: 100,
} as const;

export const LANGUAGES: readonly CodeLanguage[] = ["javascript", "python", "java"];

/** Three quests a day, picked from QUESTS. Small rewards, no streaks. */
export const DAILY_QUEST_COUNT = 3;
/** "A language you haven't used this week" looks back this many local days. */
export const NEW_LANGUAGE_LOOKBACK_DAYS = 7;
/** How far back stats are read to compute quests (lookback plus slack for time zones). */
export const STATS_WINDOW_DAYS = NEW_LANGUAGE_LOOKBACK_DAYS + 2;
/** The time zone can only be changed this often, so it can't be used to farm "new days". */
export const TIMEZONE_COOLDOWN_HOURS = 24;

export type QuestKind =
  | "finish_questions"
  | "axis_score"
  | "hard_question"
  | "new_language";

export interface QuestDefinition {
  id: string;
  title: string;
  kind: QuestKind;
  target: number;
  xp: number;
  coins: number;
  /** For axis_score quests */
  axis?: "correctness" | "communication" | "reasoning";
  minScore?: number;
}

export const QUESTS: readonly QuestDefinition[] = [
  { id: "finish_1", title: "Finish 1 question", kind: "finish_questions", target: 1, xp: 15, coins: 5 },
  { id: "finish_3", title: "Finish 3 questions", kind: "finish_questions", target: 3, xp: 30, coins: 10 },
  { id: "communication_70", title: "Score 70+ in Communication", kind: "axis_score", axis: "communication", minScore: 70, target: 1, xp: 20, coins: 5 },
  { id: "reasoning_70", title: "Score 70+ in Reasoning", kind: "axis_score", axis: "reasoning", minScore: 70, target: 1, xp: 20, coins: 5 },
  { id: "correctness_70", title: "Score 70+ in Correctness", kind: "axis_score", axis: "correctness", minScore: 70, target: 1, xp: 20, coins: 5 },
  { id: "hard_1", title: "Finish a hard question", kind: "hard_question", target: 1, xp: 25, coins: 8 },
  { id: "new_language", title: "Use a language you haven't used this week", kind: "new_language", target: 1, xp: 20, coins: 5 },
];

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
}

/** Six achievements. The same ids are seeded into public.achievements by the migration. */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: "first_run", name: "First Run", description: "Finish your first question." },
  { id: "three_down", name: "Three Down", description: "Finish 3 questions." },
  { id: "clean_explainer", name: "Clean Explainer", description: "Score 80+ in Communication on a question." },
  { id: "speed_thinker", name: "Speed Thinker", description: "Score 80+ in Reasoning on a question." },
  { id: "polyglot", name: "Polyglot", description: "Finish questions in 2 different languages." },
  { id: "level_5", name: "Level 5", description: "Reach level 5." },
];
