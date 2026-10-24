export interface AchievementStats {
  questionsCompleted: number;
  maxCommunication: number;
  maxReasoning: number;
  languages: string[];
  level: number;
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
  return earned;
}
