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
