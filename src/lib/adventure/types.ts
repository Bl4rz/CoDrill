import type { Phase } from "@/lib/adventure/config";

export type LevelStatus = "locked" | "unlocked" | "completed";
export type LevelDifficulty = "beginner" | "easy" | "medium";

export interface LevelView {
  id: string;
  order_index: number;
  title: string;
  blurb: string;
  topic: string;
  difficulty: LevelDifficulty;
  is_boss: boolean;
  reward_xp: number;
  reward_coins: number;
  status: LevelStatus;
  attempts: number;
  best_overall: number | null;
  best_approach: number | null;
  best_code: number | null;
  best_defend: number | null;
  /** Plain-language requirement, set only while the level is locked */
  unlock_text: string | null;
}

export interface AdventureResponse {
  world: { id: string; title: string; blurb: string };
  levels: LevelView[];
  completed_count: number;
  total_count: number;
  world_complete: boolean;
  next_level_id: string | null;
}

export interface HubAdventure {
  world_title: string;
  completed_count: number;
  total_count: number;
  world_complete: boolean;
  next_level: { id: string; title: string; is_boss: boolean; order_index: number } | null;
}

export interface PhaseResult {
  phase: Phase;
  score: number;
  feedback: string;
  /** Boss HP chunks this phase removed (derived from the stored score) */
  damage: number;
}

export interface AttemptView {
  id: string;
  status: "in_progress" | "passed" | "failed";
  question_text: string;
  followups: string[] | null;
  overall: number | null;
  first_completion: boolean;
  xp_awarded: number;
  coins_awarded: number;
  unlocked: { id: string; name: string; description: string }[];
  level: {
    id: string;
    order_index: number;
    title: string;
    topic: string;
    difficulty: LevelDifficulty;
    is_boss: boolean;
    reward_xp: number;
    reward_coins: number;
  };
  phases: PhaseResult[];
  /** One hint per phase: the text of the hints already used */
  hints: { phase: Phase; hint_text: string }[];
  /** Boss HP chunks left, from the stored phase scores */
  hp: number;
  hp_total: number;
  next_phase: Phase | null;
  /** On a finished attempt: the next level to try, if any */
  next_level_id: string | null;
}
