/** Shapes shared by the progression API routes and the pages that read them. */

export interface RewardState {
  granted: boolean;
  xp_gained: number;
  coins_gained: number;
  total_xp: number;
  level: number;
  previous_level: number;
  coins: number;
}

export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
}

/** What /api/interview/score returns for a signed-in player's question. */
export interface QuestionProgression extends RewardState {
  recorded: boolean;
  unlocked: UnlockedAchievement[];
}

export interface PlayerSummary {
  total_xp: number;
  level: number;
  coins: number;
  xp_in_level: number;
  xp_needed: number;
  is_max: boolean;
}

export interface QuestView {
  id: string;
  title: string;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  xp: number;
  coins: number;
}

export interface RunView {
  session_id: string;
  role_title: string;
  seniority: string;
  created_at: string;
  questions_total: number;
  questions_done: number;
  avg_score: number | null;
  xp_earned: number;
}

export interface AchievementView {
  id: string;
  name: string;
  description: string;
  unlocked_at: string | null;
}

export interface HubResponse {
  player: PlayerSummary;
  timezone: string;
  today: string;
  quests: QuestView[];
  recent_runs: RunView[];
  achievements: AchievementView[];
}

export interface ClaimResponse {
  status: "claimed" | "already_claimed" | "not_complete" | "not_found";
  player?: PlayerSummary;
  previous_level?: number;
  unlocked: UnlockedAchievement[];
}

export interface RunSummaryResponse {
  questions_total: number;
  questions_done: number;
  xp_earned: number;
  coins_earned: number;
  /** Level when this run started */
  level_before: number;
  /** Level when this run's last question was paid (quests claimed later don't count) */
  level_after: number;
  /** The player's level right now */
  level_now: number;
  player: PlayerSummary;
}
