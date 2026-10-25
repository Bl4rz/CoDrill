import { createHash } from "node:crypto";
import { dbConfigured, rpc } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import {
  ACHIEVEMENTS,
  LANGUAGES,
  QUESTS,
  STATS_WINDOW_DAYS,
  TIMEZONE_COOLDOWN_HOURS,
} from "@/lib/progression/config";
import { earnedAchievements } from "@/lib/progression/achievements";
import { levelForXp, levelProgress } from "@/lib/progression/level";
import {
  type AdventureQuestData,
  computeQuestProgress,
  eligibleQuests,
  isValidTimeZone,
  localDay,
  pickDailyQuests,
  type ResultRow,
} from "@/lib/progression/quests";
import { computeQuestionReward, type QuestionScores } from "@/lib/progression/rewards";
import type {
  AchievementView,
  ClaimResponse,
  HubResponse,
  PlayerSummary,
  QuestionProgression,
  RewardState,
  RunSummaryResponse,
  RunView,
  UnlockedAchievement,
} from "@/lib/progression/types";
import type { CodeLanguage, Difficulty, RoleSummary } from "@/lib/types";

/** The signed-in user's id, or null. Reads the session cookie; never trusts anything the browser sends. */
export async function getSignedInUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export { rpc } from "@/lib/db";

export const progressionConfigured = dbConfigured;

/** Same role, stack and focus areas => same posting, however the title is capitalised or ordered. */
export function hashPosting(role: RoleSummary): string {
  const norm = (s: string) => s.trim().toLowerCase();
  const canonical = JSON.stringify({
    t: norm(role.role_title),
    s: role.tech_stack.map(norm).sort(),
    f: role.focus_areas.map(norm).sort(),
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

export function toPlayerSummary(totalXp: number, coins: number): PlayerSummary {
  const p = levelProgress(totalXp);
  return {
    total_xp: totalXp,
    level: p.level,
    coins,
    xp_in_level: p.current,
    xp_needed: p.needed,
    is_max: p.isMax,
  };
}

interface AdventureStatsRaw {
  levels_completed: number;
  boss_defeated: boolean;
  world_complete: boolean;
  boss_unlocked: boolean;
  best_overall: number;
  comeback: boolean;
  unaided_pass: boolean;
  recent_passes: { finished_at: string; is_boss: boolean }[];
}

interface Stats {
  adventure: AdventureStatsRaw;
  timezone: string;
  questions_completed: number;
  max_communication: number;
  max_reasoning: number;
  languages: string[];
  recent: ResultRow[];
}

const adventureQuestData = (stats: Stats): AdventureQuestData => ({
  bossUnlocked: stats.adventure.boss_unlocked,
  recentPasses: stats.adventure.recent_passes,
});

async function loadStats(userId: string): Promise<Stats> {
  const since = new Date(Date.now() - STATS_WINDOW_DAYS * 86_400_000).toISOString();
  return rpc<Stats>("get_player_stats", { p_user: userId, p_since: since });
}

const asDefinition = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);

/** Checks every achievement against stored data and unlocks any newly earned. Returns only the new ones. */
async function evaluateAndUnlock(userId: string, level: number): Promise<UnlockedAchievement[]> {
  const stats = await loadStats(userId);
  const earned = earnedAchievements({
    questionsCompleted: Number(stats.questions_completed),
    maxCommunication: Number(stats.max_communication),
    maxReasoning: Number(stats.max_reasoning),
    languages: stats.languages,
    level,
    adventure: {
      bossDefeated: stats.adventure.boss_defeated,
      worldComplete: stats.adventure.world_complete,
      comeback: stats.adventure.comeback,
      bestOverall: Number(stats.adventure.best_overall),
      unaidedPass: stats.adventure.unaided_pass,
    },
  });
  if (earned.length === 0) return [];
  const fresh = await rpc<string[]>("unlock_achievements", { p_user: userId, p_ids: earned });
  return fresh.map(asDefinition).filter((a): a is NonNullable<typeof a> => Boolean(a)).map((a) => ({ ...a }));
}

/** Prefer the language the grader actually saw in the code; fall back to what the editor said. */
function pickLanguage(detected: string | undefined, claimed: string): CodeLanguage {
  const ok = (l: string | undefined): l is CodeLanguage => LANGUAGES.includes(l as CodeLanguage);
  if (ok(detected)) return detected;
  return ok(claimed) ? claimed : "javascript";
}

/** Run an issued-question lookup and turn "not issued" into null instead of an error. */
const isNotIssued = (err: unknown) =>
  err instanceof Error && (err.message.includes("question_not_issued") || (err as { code?: string }).code === "P0002");

/**
 * Stores a scored question and pays for it, all derived from server-held data.
 * The only things taken from the request are the question's identity and the
 * claimed language; difficulty comes from what the server issued, scores from the
 * grader, and the amount from the capped formula. Returns null if this question
 * was never issued to this user (e.g. a run started signed out).
 */
export async function recordQuestionCompletion(input: {
  userId: string;
  sessionId: string;
  questionId: string;
  claimedLanguage: string;
  detectedLanguage?: string;
  scores: QuestionScores;
}): Promise<(QuestionProgression & { scores: QuestionScores; language: CodeLanguage }) | null> {
  const language = pickLanguage(input.detectedLanguage, input.claimedLanguage);
  let ctx: { difficulty: Difficulty; prior_runs_of_posting: number };
  try {
    ctx = await rpc("get_question_context", {
      p_user: input.userId,
      p_session_id: input.sessionId,
      p_question_id: input.questionId,
    });
  } catch (err) {
    if (isNotIssued(err)) return null;
    throw err;
  }

  const reward = computeQuestionReward({
    difficulty: ctx.difficulty,
    scores: input.scores,
    isRepeatPosting: ctx.prior_runs_of_posting > 0,
  });

  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
  const result = await rpc<{
    recorded: boolean;
    language: CodeLanguage;
    scores: QuestionScores;
    reward: RewardState;
  }>("complete_question", {
    p_user: input.userId,
    p_session_id: input.sessionId,
    p_question_id: input.questionId,
    p_language: language,
    p_correctness: clamp(input.scores.correctness),
    p_communication: clamp(input.scores.communication),
    p_reasoning: clamp(input.scores.reasoning),
    p_xp: reward.xp,
    p_coins: reward.coins,
  });

  const unlocked = result.recorded ? await evaluateAndUnlock(input.userId, result.reward.level) : [];
  return { ...result.reward, recorded: result.recorded, unlocked, scores: result.scores, language: result.language };
}

export async function loadHub(userId: string): Promise<HubResponse> {
  const stats = await loadStats(userId);
  const tz = isValidTimeZone(stats.timezone) ? stats.timezone : "UTC";
  const today = localDay(new Date(), tz);
  const picks = pickDailyQuests(userId, today, eligibleQuests(stats.recent, tz, today, adventureQuestData(stats)));

  const hub = await rpc<{
    progression: { total_xp: number; coins: number; timezone: string };
    quests: { quest_id: string; progress: number; target: number; completed: boolean; claimed: boolean }[];
    recent_runs: RunView[];
    achievements: { id: string; unlocked_at: string }[];
    adventure: {
      world_title: string;
      completed_count: number;
      total_count: number;
      world_complete: boolean;
      next_level: { id: string; title: string; is_boss: boolean; order_index: number } | null;
    };
  }>("get_hub", {
    p_user: userId,
    p_day: today,
    p_defs: picks.map((q) => ({ id: q.id, target: q.target })),
  });

  const quests = hub.quests.flatMap((row) => {
    const def = QUESTS.find((q) => q.id === row.quest_id);
    if (!def) return [];
    const progress = Math.max(row.progress, computeQuestProgress(def, stats.recent, tz, today, adventureQuestData(stats)));
    return [
      {
        id: def.id,
        title: def.title,
        progress,
        target: row.target,
        completed: progress >= row.target,
        claimed: row.claimed,
        xp: def.xp,
        coins: def.coins,
      },
    ];
  });

  const unlockedAt = new Map(hub.achievements.map((a) => [a.id, a.unlocked_at]));
  const achievements: AchievementView[] = ACHIEVEMENTS.map((a) => ({ ...a, unlocked_at: unlockedAt.get(a.id) ?? null }));

  return {
    player: toPlayerSummary(hub.progression.total_xp, hub.progression.coins),
    timezone: tz,
    today,
    quests,
    recent_runs: hub.recent_runs,
    achievements,
    adventure: {
      world_title: hub.adventure.world_title,
      completed_count: Number(hub.adventure.completed_count),
      total_count: Number(hub.adventure.total_count),
      world_complete: Boolean(hub.adventure.world_complete),
      next_level: hub.adventure.next_level
        ? {
            id: hub.adventure.next_level.id,
            title: hub.adventure.next_level.title,
            is_boss: hub.adventure.next_level.is_boss,
            order_index: hub.adventure.next_level.order_index,
          }
        : null,
    },
  };
}

/** Recomputes progress from stored results, then pays the quest once if it is finished. */
export async function claimQuest(userId: string, questId: string): Promise<ClaimResponse> {
  const def = QUESTS.find((q) => q.id === questId);
  if (!def) return { status: "not_found", unlocked: [] };

  const stats = await loadStats(userId);
  const tz = isValidTimeZone(stats.timezone) ? stats.timezone : "UTC";
  const today = localDay(new Date(), tz);
  const progress = computeQuestProgress(def, stats.recent, tz, today, adventureQuestData(stats));

  await rpc("update_quest_progress", { p_user: userId, p_day: today, p_progress: { [def.id]: progress } });
  const res = await rpc<{ status: ClaimResponse["status"]; reward?: RewardState }>("claim_quest", {
    p_user: userId,
    p_quest_id: def.id,
    p_day: today,
    p_xp: def.xp,
    p_coins: def.coins,
  });

  if (res.status !== "claimed" || !res.reward) return { status: res.status, unlocked: [] };
  const unlocked = await evaluateAndUnlock(userId, res.reward.level);
  return {
    status: "claimed",
    player: toPlayerSummary(res.reward.total_xp, res.reward.coins),
    previous_level: res.reward.previous_level,
    unlocked,
  };
}

export async function setTimezone(userId: string, timezone: string) {
  if (!isValidTimeZone(timezone)) return { timezone: null, changed: false, reason: "invalid" as const };
  return rpc<{ timezone: string | null; changed: boolean; reason?: string }>("set_timezone", {
    p_user: userId,
    p_tz: timezone,
    p_cooldown_hours: TIMEZONE_COOLDOWN_HOURS,
  });
}

export async function runSummary(userId: string, sessionId: string): Promise<RunSummaryResponse> {
  const s = await rpc<{
    questions_total: number;
    questions_done: number;
    xp_earned: number;
    coins_earned: number;
    total_xp: number;
    level: number;
    coins: number;
    xp_before_run: number;
    xp_at_run_end: number;
  }>("get_run_summary", { p_user: userId, p_session_id: sessionId });
  return {
    questions_total: Number(s.questions_total),
    questions_done: Number(s.questions_done),
    xp_earned: Number(s.xp_earned),
    coins_earned: Number(s.coins_earned),
    level_before: levelForXp(Number(s.xp_before_run)),
    level_after: levelForXp(Number(s.xp_at_run_end)),
    level_now: s.level,
    player: toPlayerSummary(s.total_xp, s.coins),
  };
}

/**
 * Records a freshly generated run. If progression isn't configured or the write
 * fails, the run still works; it just won't earn XP. Never blocks question generation.
 */
export async function issueRunIfConfigured(input: {
  userId: string;
  sessionId: string;
  role: RoleSummary;
  postingHash: string;
  questions: { id: string; difficulty: Difficulty; topic: string; order_index: number }[];
}): Promise<boolean> {
  if (!progressionConfigured()) return false;
  try {
    await rpc("issue_run", {
      p_user: input.userId,
      p_session_id: input.sessionId,
      p_role_title: input.role.role_title,
      p_seniority: input.role.seniority,
      p_posting_hash: input.postingHash,
      p_questions: input.questions.map((q) => ({
        question_id: q.id,
        difficulty: q.difficulty,
        topic: q.topic,
        order_index: q.order_index,
      })),
    });
    return true;
  } catch (err) {
    console.error("Could not record the issued run:", err instanceof Error ? err.message : err);
    return false;
  }
}
