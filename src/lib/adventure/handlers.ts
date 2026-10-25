import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ADVENTURE, PHASES, type Phase } from "@/lib/adventure/config";
import type { AdventureAi } from "@/lib/adventure/ai";
import {
  attemptQuery,
  finishBody,
  followupsBody,
  hintBody,
  phaseBody,
  startBody,
} from "@/lib/adventure/schemas";
import { bossHp, isVictory, levelPassed, nextPhase, overallScore, phaseDamage } from "@/lib/adventure/rules";
import type { AttemptView, LevelDifficulty, PhaseResult, FinishedResult } from "@/lib/adventure/types";
import type { UnlockedAchievement } from "@/lib/progression/types";

/**
 * The server side of Adventure, written against injected dependencies so the exact
 * same code runs in the routes and under test (against a real Postgres, with a
 * fake AI). Rules every handler follows:
 *   - the caller must be signed in, and every body is validated with Zod;
 *   - the browser names an attempt and submits its own work, nothing else: scores,
 *     HP, XP, coins and unlocks are decided here from stored data;
 *   - the AI returns text and a 0-100 score; if it fails or returns garbage, nothing
 *     is stored or charged and the player can simply try again.
 */
export interface AdventureDeps {
  rpc: <T>(fn: string, args: Record<string, unknown>) => Promise<T>;
  getUserId: () => Promise<string | null>;
  /** Counts a start against the daily session limit and spend cap, exactly like a normal run. */
  guardNewSession: (req: NextRequest, userId: string) => Promise<NextResponse | null>;
  /** Counts one AI call against the global spend cap. */
  guardAi: () => Promise<NextResponse | null>;
  /** Gives back a daily start that failed on our side. */
  refundStart: (userId: string) => Promise<void>;
  /** Checks stored data and unlocks any newly earned achievements. */
  unlockAchievements: (userId: string) => Promise<UnlockedAchievement[]>;
  ai: AdventureAi;
}

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const signedOut = () => json({ error: "Sign in to play Adventure." }, 401);
const badRequest = (error = "That request wasn't valid.") => json({ error }, 400);
const aiFailed = (what = "That") =>
  json(
    { error: `${what} didn't work this time. Nothing was counted. Try again.`, reason: "ai_failed", retryable: true },
    502,
  );

function dbError(err: unknown): NextResponse | null {
  const m = err instanceof Error ? err.message : "";
  if (m.includes("attempt_not_found")) return json({ error: "We couldn't find that attempt.", reason: "attempt_not_found" }, 404);
  if (m.includes("level_not_found")) return json({ error: "We couldn't find that level.", reason: "level_not_found" }, 404);
  if (m.includes("level_locked")) return json({ error: "That level is still locked.", reason: "level_locked" }, 403);
  if (m.includes("phase_out_of_order")) return json({ error: "Finish the earlier step first.", reason: "phase_out_of_order" }, 409);
  if (m.includes("phase_already_scored")) return json({ error: "That step is already scored.", reason: "phase_already_scored" }, 409);
  if (m.includes("attempt_finished")) return json({ error: "This attempt is already finished.", reason: "attempt_finished" }, 409);
  if (m.includes("phases_incomplete")) return json({ error: "Finish all three steps first.", reason: "phases_incomplete" }, 409);
  return null;
}

async function guarded(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    const mapped = dbError(err);
    if (mapped) return mapped;
    console.error(err);
    return json({ error: "Something went wrong. Try again." }, 500);
  }
}

export const hashQuestion = (text: string) =>
  createHash("sha256").update(text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 600)).digest("hex").slice(0, 32);

// --------------------------------------------------------------- reading an attempt
interface RawAttempt {
  attempt: {
    id: string;
    status: AttemptView["status"];
    question_text: string;
    followups: string[] | null;
    overall: number | null;
    first_completion: boolean;
    xp_awarded: number;
    coins_awarded: number;
    unlocked: UnlockedAchievement[];
  };
  level: AttemptView["level"] & { world_id: string };
  phases: { phase: Phase; score: number; feedback: string; submission: Record<string, unknown> }[];
  hints: { phase: Phase; hint_text: string }[];
}

interface Loaded {
  view: AttemptView;
  submissions: Partial<Record<Phase, Record<string, unknown>>>;
}

async function loadAttempt(deps: AdventureDeps, userId: string, attemptId: string): Promise<Loaded> {
  const raw = await deps.rpc<RawAttempt>("get_adventure_attempt", { p_user: userId, p_attempt_id: attemptId });
  const phases: PhaseResult[] = raw.phases.map((p) => ({
    phase: p.phase,
    score: p.score,
    feedback: p.feedback,
    damage: phaseDamage(p.phase, p.score),
  }));
  const scores = Object.fromEntries(phases.map((p) => [p.phase, p.score])) as Partial<Record<Phase, number>>;

  let nextLevelId: string | null = null;
  if (raw.attempt.status === "passed") {
    const adv = await deps.rpc<{ next_level_id: string | null }>("get_adventure", { p_user: userId, p_world: raw.level.world_id });
    nextLevelId = adv.next_level_id;
  }

  return {
    view: {
      id: raw.attempt.id,
      status: raw.attempt.status,
      question_text: raw.attempt.question_text,
      followups: raw.attempt.followups,
      overall: raw.attempt.overall,
      first_completion: raw.attempt.first_completion,
      xp_awarded: raw.attempt.xp_awarded,
      coins_awarded: raw.attempt.coins_awarded,
      unlocked: raw.attempt.unlocked,
      level: {
        id: raw.level.id,
        order_index: raw.level.order_index,
        title: raw.level.title,
        topic: raw.level.topic,
        difficulty: raw.level.difficulty as LevelDifficulty,
        is_boss: raw.level.is_boss,
        reward_xp: raw.level.reward_xp,
        reward_coins: raw.level.reward_coins,
      },
      phases,
      hints: raw.hints,
      hp: bossHp(scores),
      hp_total: ADVENTURE.bossHp,
      next_phase: nextPhase(phases.map((p) => p.phase)),
      next_level_id: nextLevelId,
    },
    submissions: Object.fromEntries(raw.phases.map((p) => [p.phase, p.submission])),
  };
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

// ------------------------------------------------------------------------- start
export async function handleStart(req: NextRequest, deps: AdventureDeps): Promise<NextResponse> {
  return guarded(async () => {
    const userId = await deps.getUserId();
    if (!userId) return signedOut();
    const body = startBody.safeParse(await req.json().catch(() => null));
    if (!body.success) return badRequest("Missing level_id.");

    // Is it unlocked? Checked from stored progress BEFORE anything is counted, so poking at a
    // locked level can't use up a daily start.
    const adv = await deps.rpc<{
      levels: { id: string; title: string; topic: string; difficulty: string; is_boss: boolean; status: string }[];
    }>("get_adventure", { p_user: userId, p_world: "syntax_valley" });
    const level = adv.levels.find((l) => l.id === body.data.level_id);
    if (!level) return json({ error: "We couldn't find that level.", reason: "level_not_found" }, 404);
    if (level.status === "locked") return json({ error: "That level is still locked.", reason: "level_locked" }, 403);

    // A start is a run: same daily limit, per-user bucket and spend cap as a normal run.
    const blocked = await deps.guardNewSession(req, userId);
    if (blocked) return blocked;

    const history = await deps
      .rpc<{ texts: string[]; hashes: string[] }>("get_level_history", { p_user: userId, p_level_id: level.id })
      .catch(() => ({ texts: [] as string[], hashes: [] as string[] }));

    let question: string | null = null;
    for (let i = 0; i < 3 && !question; i++) {
      try {
        const q = await deps.ai.generateQuestion({ level, previous: history.texts });
        // Prefer a question this player hasn't had for this level; accept a repeat only as a last resort.
        if (!history.hashes.includes(hashQuestion(q)) || i === 2) question = q;
      } catch (err) {
        // An unusable generation (bad shape, gave the answer away, model hiccup) is just tried again.
        console.error(err);
      }
    }
    if (!question) {
      await deps.refundStart(userId);
      return aiFailed("Writing the question");
    }

    try {
      const started = await deps.rpc<{ attempt_id: string; level_id: string }>("start_adventure_attempt", {
        p_user: userId,
        p_level_id: level.id,
        p_question_text: question,
        p_question_hash: hashQuestion(question),
      });
      return json({ attempt_id: started.attempt_id, level_id: started.level_id });
    } catch (err) {
      await deps.refundStart(userId);
      throw err;
    }
  });
}

// ----------------------------------------------------------------------- attempt
export async function handleAttempt(req: NextRequest, deps: AdventureDeps): Promise<NextResponse> {
  return guarded(async () => {
    const userId = await deps.getUserId();
    if (!userId) return signedOut();
    const q = attemptQuery.safeParse({ attempt_id: new URL(req.url).searchParams.get("attempt_id") });
    if (!q.success) return badRequest("Missing attempt_id.");
    return json((await loadAttempt(deps, userId, q.data.attempt_id)).view);
  });
}

// -------------------------------------------------------------------------- hint
export async function handleHint(req: NextRequest, deps: AdventureDeps): Promise<NextResponse> {
  return guarded(async () => {
    const userId = await deps.getUserId();
    if (!userId) return signedOut();
    const body = hintBody.safeParse(await req.json().catch(() => null));
    if (!body.success) return badRequest();

    const { view, submissions } = await loadAttempt(deps, userId, body.data.attempt_id);
    if (view.status !== "in_progress") return json({ error: "This attempt is already finished.", reason: "attempt_finished" }, 409);
    const existing = view.hints.find((h) => h.phase === body.data.phase);
    if (existing) return json({ hint_text: existing.hint_text, granted: false });
    if (view.next_phase !== body.data.phase) return json({ error: "Hints are for the step you're on.", reason: "wrong_phase" }, 409);

    const capped = await deps.guardAi();
    if (capped) return capped;

    let text: string;
    try {
      text = await deps.ai.generateHint({
        phase: body.data.phase,
        question: view.question_text,
        approach: str(submissions.approach?.approach_text),
        code: str(submissions.code?.code),
        language: str(submissions.code?.language),
        followups: view.followups ?? undefined,
        draft: body.data.draft,
      });
    } catch (err) {
      console.error(err);
      return aiFailed("The hint");
    }

    const saved = await deps.rpc<{ granted: boolean; hint_text: string }>("record_adventure_hint", {
      p_user: userId,
      p_attempt_id: view.id,
      p_phase: body.data.phase,
      p_text: text,
    });
    return json({ hint_text: saved.hint_text, granted: saved.granted });
  });
}

// --------------------------------------------------------------------- follow-ups
export async function handleFollowups(req: NextRequest, deps: AdventureDeps): Promise<NextResponse> {
  return guarded(async () => {
    const userId = await deps.getUserId();
    if (!userId) return signedOut();
    const body = followupsBody.safeParse(await req.json().catch(() => null));
    if (!body.success) return badRequest();

    const { view, submissions } = await loadAttempt(deps, userId, body.data.attempt_id);
    if (view.status !== "in_progress") return json({ error: "This attempt is already finished.", reason: "attempt_finished" }, 409);
    if (!view.phases.some((p) => p.phase === "code")) return json({ error: "Finish the code step first.", reason: "phase_out_of_order" }, 409);
    if (view.followups) return json({ followups: view.followups });

    const capped = await deps.guardAi();
    if (capped) return capped;

    let questions: string[];
    try {
      questions = await deps.ai.generateFollowups({
        question: view.question_text,
        approach: str(submissions.approach?.approach_text) ?? "",
        code: str(submissions.code?.code) ?? "",
        language: str(submissions.code?.language) ?? "javascript",
      });
    } catch (err) {
      console.error(err);
      return aiFailed("Writing the follow-up questions");
    }
    const stored = await deps.rpc<string[]>("store_adventure_followups", {
      p_user: userId,
      p_attempt_id: view.id,
      p_followups: questions,
    });
    return json({ followups: stored });
  });
}

// ---------------------------------------------------------------- finishing an attempt
/**
 * Once all three phases are stored, work out the overall score and pass/fail from
 * them, then close the attempt and pay (once) in a single database transaction.
 * Safe to call again: a finished attempt just returns its stored result.
 */
async function finishIfReady(deps: AdventureDeps, userId: string, loaded: Loaded): Promise<FinishedResult | null> {
  const { view } = loaded;
  if (view.status !== "in_progress" || view.phases.length < PHASES.length) return null;

  const scores = Object.fromEntries(view.phases.map((p) => [p.phase, p.score])) as Record<Phase, number>;
  const overall = overallScore(scores);
  const passed = view.level.is_boss ? isVictory(scores) : levelPassed(scores);

  const fin = await deps.rpc<{
    finalized: boolean;
    passed: boolean;
    first_completion: boolean;
    xp_gained: number;
    coins_gained: number;
    reward?: { previous_level: number; level: number } | null;
  }>("finalize_adventure_attempt", {
    p_user: userId,
    p_attempt_id: view.id,
    p_overall: overall,
    p_passed: passed,
    p_replay_xp: ADVENTURE.replayReward.xp,
    p_replay_coins: ADVENTURE.replayReward.coins,
  });

  let unlocked: UnlockedAchievement[] = [];
  if (fin.finalized && fin.passed) {
    unlocked = await deps.unlockAchievements(userId).catch((err) => {
      console.error(err);
      return [];
    });
    if (unlocked.length) {
      await deps.rpc("set_adventure_unlocked", { p_user: userId, p_attempt_id: view.id, p_unlocked: unlocked }).catch(() => {});
    }
  }

  return {
    passed: fin.passed,
    victory: fin.passed && view.level.is_boss,
    overall,
    first_completion: fin.first_completion,
    xp_gained: fin.xp_gained,
    coins_gained: fin.coins_gained,
    unlocked,
    level_up: fin.reward && fin.reward.level > fin.reward.previous_level ? { from: fin.reward.previous_level, to: fin.reward.level } : null,
  };
}

export async function handleFinish(req: NextRequest, deps: AdventureDeps): Promise<NextResponse> {
  return guarded(async () => {
    const userId = await deps.getUserId();
    if (!userId) return signedOut();
    const body = finishBody.safeParse(await req.json().catch(() => null));
    if (!body.success) return badRequest();
    const loaded = await loadAttempt(deps, userId, body.data.attempt_id);
    const result = await finishIfReady(deps, userId, loaded);
    return json({ attempt: (await loadAttempt(deps, userId, body.data.attempt_id)).view, result });
  });
}

// ------------------------------------------------------------------------ phase
export async function handlePhase(req: NextRequest, deps: AdventureDeps): Promise<NextResponse> {
  return guarded(async () => {
    const userId = await deps.getUserId();
    if (!userId) return signedOut();
    const body = phaseBody.safeParse(await req.json().catch(() => null));
    if (!body.success) return badRequest("That step's answer wasn't valid.");
    const input = body.data;

    const loaded = await loadAttempt(deps, userId, input.attempt_id);
    const { view, submissions } = loaded;

    // A step that is already scored is never scored again (double submit, refresh, retry):
    // just hand back what is stored, and finish the attempt if that was the last step.
    const already = view.phases.find((p) => p.phase === input.phase);
    if (already) {
      const result = await finishIfReady(deps, userId, loaded);
      const fresh = (await loadAttempt(deps, userId, view.id)).view;
      return json({ phase: already, recorded: false, hp: fresh.hp, next_phase: fresh.next_phase, finished: fresh.status !== "in_progress", result });
    }
    if (view.status !== "in_progress") return json({ error: "This attempt is already finished.", reason: "attempt_finished" }, 409);
    if (view.next_phase !== input.phase) return json({ error: "Finish the earlier step first.", reason: "phase_out_of_order" }, 409);

    let work: Parameters<AdventureAi["scorePhase"]>[0];
    let submission: Record<string, unknown>;
    if (input.phase === "approach") {
      work = { phase: "approach", question: view.question_text, approach: input.approach_text };
      submission = { approach_text: input.approach_text };
    } else if (input.phase === "code") {
      work = {
        phase: "code",
        question: view.question_text,
        approach: str(submissions.approach?.approach_text),
        code: input.code,
        language: input.language,
      };
      submission = { code: input.code, language: input.language };
    } else {
      const followups = view.followups;
      if (!followups) return json({ error: "Get the follow-up questions first.", reason: "phase_out_of_order" }, 409);
      if (input.answers.length !== followups.length) return badRequest("Answer every follow-up question.");
      work = {
        phase: "defend",
        question: view.question_text,
        approach: str(submissions.approach?.approach_text),
        code: str(submissions.code?.code),
        language: str(submissions.code?.language),
        followups,
        answers: input.answers,
      };
      submission = { answers: input.answers };
    }

    const capped = await deps.guardAi();
    if (capped) return capped;

    // If scoring fails or returns garbage, nothing is stored and nothing is counted.
    let scored: { score: number; feedback: string };
    try {
      scored = await deps.ai.scorePhase(work);
    } catch (err) {
      console.error(err);
      return aiFailed("Scoring");
    }

    const stored = await deps.rpc<{ recorded: boolean; score: number; feedback: string }>("record_adventure_phase", {
      p_user: userId,
      p_attempt_id: view.id,
      p_phase: input.phase,
      p_score: scored.score,
      p_feedback: scored.feedback,
      p_submission: submission,
    });

    const after = await loadAttempt(deps, userId, view.id);
    const result = await finishIfReady(deps, userId, after);
    const final = result ? (await loadAttempt(deps, userId, view.id)).view : after.view;
    const phase = final.phases.find((p) => p.phase === input.phase) ?? {
      phase: input.phase,
      score: stored.score,
      feedback: stored.feedback,
      damage: phaseDamage(input.phase, stored.score),
    };
    return json({
      phase,
      recorded: stored.recorded,
      hp: final.hp,
      next_phase: final.next_phase,
      finished: final.status !== "in_progress",
      result,
    });
  });
}
