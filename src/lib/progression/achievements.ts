export interface AdventureAchievementStats {
  bossDefeated: boolean;
  worldComplete: boolean;
  comeback: boolean;
  /** Highest overall score on a passed adventure attempt */
  bestOverall: number;
  /** A passed attempt that used no hint */
  unaidedPass: boolean;
}

export interface AchievementStats {
  questionsCompleted: number;
  maxCommunication: number;
  maxReasoning: number;
  languages: string[];
  level: number;
  adventure?: AdventureAchievementStats;
}

/** Every achievement the stats earn. Unlocking is idempotent in the database, so this can run any time. */
export function earnedAchievements(s: AchievementStats): string[] {
  const earned: string[] = [];
  if (s.questionsCompleted >= 1) earned.push("first_run");
  if (s.questionsCompleted >= 3) earned.push("three_down");
  if (s.maxCommunication >= 80) earned.push("clean_explainer");
  if (s.maxReasoning >= 80) earned.push("speed_thinker");
  if (new Set(s.languages).size >= 2) earned.push("polyglot");
  if (s.level >= 5) earned.push("level_5");
  const a = s.adventure;
  if (a) {
    if (a.bossDefeated) earned.push("boss_slayer");
    if (a.worldComplete) earned.push("world_explorer");
    if (a.comeback) earned.push("comeback");
    if (a.bestOverall >= 90) earned.push("sharp_mind");
    if (a.unaidedPass) earned.push("no_training_wheels");
  }
  return earned;
}
