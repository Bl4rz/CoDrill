import { randomUUID } from "node:crypto";
import { Json, type TestDb } from "./db";

export interface IssuedRun {
  sessionId: string;
  questionIds: string[];
}

/** Record a run the way /api/generate-questions does. */
export async function issueRun(
  db: TestDb,
  userId: string,
  opts: { hash?: string; difficulties?: ("easy" | "medium" | "hard")[]; role?: string } = {},
): Promise<IssuedRun> {
  const sessionId = randomUUID();
  const difficulties = opts.difficulties ?? ["easy", "medium", "hard"];
  const questions = difficulties.map((difficulty, i) => ({
    question_id: randomUUID(),
    difficulty,
    topic: `topic-${i}`,
    order_index: i,
  }));
  await db.rpc("issue_run", {
    p_user: userId,
    p_session_id: sessionId,
    p_role_title: opts.role ?? "Backend Engineer",
    p_seniority: "Mid-level",
    p_posting_hash: opts.hash ?? "hash-a",
    p_questions: new Json(questions),
  });
  return { sessionId, questionIds: questions.map((q) => q.question_id) };
}

export const scoresArgs = (c = 70, m = 70, r = 70) => ({
  p_correctness: c,
  p_communication: m,
  p_reasoning: r,
});

export interface CompleteResult {
  recorded: boolean;
  language: string;
  scores: { correctness: number; communication: number; reasoning: number };
  reward: {
    granted: boolean;
    xp_gained: number;
    coins_gained: number;
    total_xp: number;
    level: number;
    previous_level: number;
    coins: number;
  };
}

export async function completeQuestion(
  db: TestDb,
  userId: string,
  run: IssuedRun,
  index: number,
  over: Record<string, unknown> = {},
) {
  return db.rpc<CompleteResult>("complete_question", {
    p_user: userId,
    p_session_id: run.sessionId,
    p_question_id: run.questionIds[index],
    p_language: "javascript",
    ...scoresArgs(),
    p_xp: 30,
    p_coins: 5,
    ...over,
  });
}

export interface HubRaw {
  progression: { total_xp: number; level: number; coins: number; timezone: string };
  quests: { quest_id: string; progress: number; target: number; completed: boolean; claimed: boolean }[];
  recent_runs: {
    role_title: string;
    questions_total: number;
    questions_done: number;
    avg_score: number | null;
    xp_earned: number;
  }[];
  achievements: { id: string; unlocked_at: string }[];
}

export interface RunSummaryRaw {
  questions_total: number;
  questions_done: number;
  xp_earned: number;
  coins_earned: number;
  total_xp: number;
  level: number;
  coins: number;
  xp_before_run: number;
  xp_at_run_end: number;
}

export interface StatsRaw {
  timezone: string;
}

// ---------------------------------------------------------------- adventure
import { overallScore, levelPassed } from "@/lib/adventure/rules";
import type { Phase } from "@/lib/adventure/config";

export interface FinalizeResult {
  finalized: boolean;
  passed: boolean;
  overall: number;
  first_completion: boolean;
  xp_gained: number;
  coins_gained: number;
  reward?: { granted: boolean; total_xp: number; coins: number } | null;
}

export async function startAttempt(db: TestDb, userId: string, levelId: string, text?: string) {
  const res = await db.rpc<{ attempt_id: string; level_id: string }>("start_adventure_attempt", {
    p_user: userId,
    p_level_id: levelId,
    p_question_text: text ?? `Write a small function for ${levelId} that handles the usual cases. ${randomUUID()}`,
    p_question_hash: randomUUID(),
  });
  return res.attempt_id;
}

export async function scorePhase(db: TestDb, userId: string, attemptId: string, phase: Phase, score: number) {
  return db.rpc<{ recorded: boolean; score: number }>("record_adventure_phase", {
    p_user: userId,
    p_attempt_id: attemptId,
    p_phase: phase,
    p_score: score,
    p_feedback: `Feedback for ${phase}`,
    p_submission: new Json({ phase }),
  });
}

export async function storeFollowups(db: TestDb, userId: string, attemptId: string) {
  return db.rpc("store_adventure_followups", {
    p_user: userId,
    p_attempt_id: attemptId,
    p_followups: new Json(["What is the time complexity?", "How does it handle empty input?"]),
  });
}

export async function scoreAll(db: TestDb, userId: string, attemptId: string, scores: [number, number, number]) {
  await scorePhase(db, userId, attemptId, "approach", scores[0]);
  await scorePhase(db, userId, attemptId, "code", scores[1]);
  await storeFollowups(db, userId, attemptId);
  await scorePhase(db, userId, attemptId, "defend", scores[2]);
}

export function finalizeAttempt(
  db: TestDb,
  userId: string,
  attemptId: string,
  scores: [number, number, number],
  replay: { xp?: number; coins?: number } = {},
) {
  const byPhase = { approach: scores[0], code: scores[1], defend: scores[2] };
  return db.rpc<FinalizeResult>("finalize_adventure_attempt", {
    p_user: userId,
    p_attempt_id: attemptId,
    p_overall: overallScore(byPhase),
    p_passed: levelPassed(byPhase),
    p_replay_xp: replay.xp ?? 0,
    p_replay_coins: replay.coins ?? 0,
  });
}

/** Start, score all three phases and finalize. Scores default to a pass. */
export async function playLevel(
  db: TestDb,
  userId: string,
  levelId: string,
  scores: [number, number, number] = [80, 80, 80],
) {
  const attemptId = await startAttempt(db, userId, levelId);
  await scoreAll(db, userId, attemptId, scores);
  const result = await finalizeAttempt(db, userId, attemptId, scores);
  return { attemptId, result };
}

export const LEVELS = ["sv_1", "sv_2", "sv_3", "sv_4", "sv_5"] as const;
export const BOSS = "sv_boss";

export interface AdventureRaw {
  world: { id: string; title: string };
  levels: { id: string; order_index: number; status: string; attempts: number; best_overall: number | null; is_boss: boolean; reward_xp: number; reward_coins: number; topic: string; difficulty: string }[];
  completed_count: number;
  total_count: number;
  world_complete: boolean;
  next_level_id: string | null;
}

export interface AdventureStatsAll {
  adventure: {
    levels_completed: number;
    boss_defeated: boolean;
    world_complete: boolean;
    boss_unlocked: boolean;
    best_overall: number;
    comeback: boolean;
    unaided_pass: boolean;
    recent_passes: { finished_at: string; is_boss: boolean }[];
  };
}
