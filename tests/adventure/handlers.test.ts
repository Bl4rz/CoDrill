import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ADVENTURE } from "@/lib/adventure/config";
import {
  handleAttempt,
  handleFinish,
  handleFollowups,
  handleHint,
  handlePhase,
  handleStart,
} from "@/lib/adventure/handlers";
import { bossHp } from "@/lib/adventure/rules";
import { guardNewSession } from "@/lib/usage";
import { createTestDb, type TestDb } from "../helpers/db";
import { BOSS, LEVELS, playLevel } from "../helpers/fixtures";
import { enforceLimits, makeDeps, makeFakeAi, read, request } from "../helpers/adventure";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const start = (deps: ReturnType<typeof makeDeps>, body: unknown) => handleStart(request("/api/adventure/start", body), deps).then(read);
const phase = (deps: ReturnType<typeof makeDeps>, body: unknown) => handlePhase(request("/api/adventure/phase", body), deps).then(read);
const hint = (deps: ReturnType<typeof makeDeps>, body: unknown) => handleHint(request("/api/adventure/hint", body), deps).then(read);
const followups = (deps: ReturnType<typeof makeDeps>, body: unknown) => handleFollowups(request("/api/adventure/followups", body), deps).then(read);
const finish = (deps: ReturnType<typeof makeDeps>, body: unknown) => handleFinish(request("/api/adventure/finish", body), deps).then(read);
const attemptOf = (deps: ReturnType<typeof makeDeps>, id: string) => handleAttempt(request(`/api/adventure/attempt?attempt_id=${id}`, undefined, "GET"), deps).then(read);

const xp = async (user: string) => Number((await db.pool.query("select coalesce(total_xp,0) as x from public.player_progression where user_id=$1", [user])).rows[0]?.x ?? 0);
const count = async (sql: string, params: unknown[] = []) => Number((await db.pool.query(sql, params)).rows[0].count);

/** Play one attempt through the real handlers. */
async function play(deps: ReturnType<typeof makeDeps>, levelId: string) {
  const started = await start(deps, { level_id: levelId });
  expect(started.status, JSON.stringify(started.body)).toBe(200);
  const id = started.body.attempt_id as string;
  const a = await phase(deps, { attempt_id: id, phase: "approach", approach_text: "I would loop over the items and keep a running total." });
  const c = await phase(deps, { attempt_id: id, phase: "code", code: "function f(xs){ let t=0; for (const x of xs) t+=x; return t; }", language: "javascript" });
  const f = await followups(deps, { attempt_id: id });
  const d = await phase(deps, { attempt_id: id, phase: "defend", answers: ["It is linear.", "It returns zero."] });
  return { id, started, a, c, f, d };
}

describe("starting a level", () => {
  it("creates an attempt with one question generated for the level's fixed topic and difficulty", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi();
    const res = await start(makeDeps(db, user, ai), { level_id: "sv_1" });
    expect(res.status).toBe(200);
    expect(res.body.level_id).toBe("sv_1");
    expect(ai.lastQuestionInput?.level).toMatchObject({ topic: "variables and loops", difficulty: "beginner", is_boss: false });
    const { rows } = await db.pool.query("select level_id, status, question_text from public.adventure_attempts where id = $1", [res.body.attempt_id]);
    expect(rows[0]).toMatchObject({ level_id: "sv_1", status: "in_progress" });
    expect(rows[0].question_text).toContain("variables and loops");
  });

  it("requires sign-in and a valid body, and ignores anything else the browser sends", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi();
    expect((await start(makeDeps(db, null, ai), { level_id: "sv_1" })).status).toBe(401);
    expect((await start(makeDeps(db, user, ai), {})).status).toBe(400);
    expect((await start(makeDeps(db, user, ai), { level_id: "" })).status).toBe(400);
    expect((await start(makeDeps(db, user, ai), { level_id: "nope" })).status).toBe(404);
    // extra fields like "unlocked" or "status" do nothing
    const res = await start(makeDeps(db, user, ai), { level_id: "sv_3", unlocked: true, status: "unlocked", force: true });
    expect(res.status).toBe(403);
  });

  it("a locked level can't be started by calling the API directly, and costs the player nothing", async () => {
    enforceLimits(5);
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    for (const level of ["sv_2", "sv_3", "sv_5", BOSS]) {
      const res = await start(deps, { level_id: level });
      expect(res.status, level).toBe(403);
      expect(res.body.reason).toBe("level_locked");
    }
    expect(ai.calls.question).toBe(0);
    expect(await count("select count(*) from public.adventure_attempts where user_id = $1", [user])).toBe(0);
    expect(await count("select count(*) from public.usage_counters where scope like $1", [`%${user}%`])).toBe(0);
  });

  it("a replay asks for a new question, not one the player already had", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    ai.questions = ["The very same exercise about adding up a list of numbers with a loop."];
    const first = await start(deps, { level_id: "sv_1" });
    ai.questions = [
      "The very same exercise about adding up a list of numbers with a loop.",
      "THE VERY SAME   exercise about adding up a list of numbers with a loop.",
      "A different exercise: count how many even numbers are in a list using a loop.",
    ];
    const again = await start(deps, { level_id: "sv_1" });
    const rows = (await db.pool.query("select question_text from public.adventure_attempts where id = any($1)", [[first.body.attempt_id, again.body.attempt_id]])).rows;
    expect(rows.map((r) => r.question_text).sort()).toEqual([
      "A different exercise: count how many even numbers are in a list using a loop.",
      "The very same exercise about adding up a list of numbers with a loop.",
    ]);
    expect(ai.calls.question).toBe(1 + 3);
    expect(ai.lastQuestionInput?.previous.length).toBe(1);
  });

  it("if the AI can't write a question, the player gets a retryable error and keeps their daily start", async () => {
    enforceLimits(1);
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    ai.fail.question = true;
    const failed = await start(deps, { level_id: "sv_1" });
    expect(failed.status).toBe(502);
    expect(failed.body).toMatchObject({ reason: "ai_failed", retryable: true });
    expect(await count("select count(*) from public.adventure_attempts where user_id = $1", [user])).toBe(0);

    ai.fail.question = false;
    const ok = await start(deps, { level_id: "sv_1" });
    expect(ok.status).toBe(200); // the limit of 1 was not used up by the failure
    const blocked = await start(deps, { level_id: "sv_1" });
    expect(blocked.status).toBe(429);
  });
});

describe("the daily limit and spend cap apply to every start", () => {
  it("level starts use the same per-user daily bucket as normal runs", async () => {
    enforceLimits(2);
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);

    // one start the normal way (this is what /api/generate-questions does)
    const normal = await guardNewSession(request("/api/generate-questions", {}), user);
    expect(normal.response).toBeNull();

    expect((await start(deps, { level_id: "sv_1" })).status).toBe(200);
    const third = await start(deps, { level_id: "sv_1" });
    expect(third.status).toBe(429);
    expect(third.body.reason).toBe("daily_limit");
    expect(await count("select count(*) from public.adventure_attempts where user_id = $1", [user])).toBe(1);
  });

  it("the boss counts too, and a blocked start makes no attempt and calls no AI", async () => {
    enforceLimits(1);
    const user = await db.newUser();
    for (const l of LEVELS) await playLevel(db, user, l); // direct DB setup, bypassing the API
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    expect((await start(deps, { level_id: BOSS })).status).toBe(200);
    const calls = ai.calls.question;
    const blocked = await start(deps, { level_id: BOSS });
    expect(blocked.status).toBe(429);
    expect(ai.calls.question).toBe(calls);
    expect(await count("select count(*) from public.adventure_attempts where user_id = $1 and level_id = $2", [user, BOSS])).toBe(1);
  });

  it("the limit is per player", async () => {
    enforceLimits(1);
    const a = await db.newUser();
    const b = await db.newUser();
    const ai = makeFakeAi();
    expect((await start(makeDeps(db, a, ai), { level_id: "sv_1" })).status).toBe(200);
    expect((await start(makeDeps(db, a, ai), { level_id: "sv_1" })).status).toBe(429);
    expect((await start(makeDeps(db, b, ai), { level_id: "sv_1" })).status).toBe(200);
  });

  /** Handlers wired to a freshly loaded usage module, so its in-memory cap marker starts clean. */
  async function capped(cap: number, userId: string) {
    vi.resetModules();
    vi.stubEnv("ENFORCE_LIMITS", "true");
    vi.stubEnv("DAILY_SESSION_LIMIT", "100");
    vi.stubEnv("GLOBAL_DAILY_AI_CAP", String(cap));
    await db.pool.query("delete from public.usage_counters where scope = 'global:ai'");
    const { setRpcTransport } = await import("@/lib/db");
    setRpcTransport(db.transport);
    const usage = await import("@/lib/usage");
    const handlers = await import("@/lib/adventure/handlers");
    const ai = makeFakeAi();
    const deps = {
      ...makeDeps(db, userId, ai),
      guardNewSession: async (req: Parameters<typeof usage.guardNewSession>[0], uid: string) => (await usage.guardNewSession(req, uid)).response,
      guardAi: usage.guardAi,
      refundStart: usage.refundNewSession,
    };
    setRpcTransport(db.transport);
    return { ai, handlers, deps };
  }

  it("the global spend cap stops starts with the 'server needs a break' response", async () => {
    const user = await db.newUser();
    const { ai, handlers, deps } = await capped(1, user);
    const go = () => handlers.handleStart(request("/api/adventure/start", { level_id: "sv_1" }), deps).then(read);
    // The cap is counted after the first call, so it can let one extra request through, then it refuses.
    expect((await go()).status).toBe(200);
    expect((await go()).status).toBe(200);
    const third = await go();
    expect(third.status).toBe(503);
    expect(third.body.reason).toBe("capacity");
    expect(ai.calls.question).toBe(2); // the refused start never reached the AI
  });

  it("scoring, follow-ups and hints also count against the spend cap", async () => {
    const user = await db.newUser();
    const { ai, handlers, deps } = await capped(2, user);
    const post = (path: string, body: unknown, fn: (r: ReturnType<typeof request>, d: typeof deps) => Promise<Response>) => fn(request(path, body), deps).then(read);
    const started = await handlers.handleStart(request("/api/adventure/start", { level_id: "sv_1" }), deps).then(read);
    const id = started.body.attempt_id;
    const approach = await post("/api/adventure/phase", { attempt_id: id, phase: "approach", approach_text: "I would loop and add." }, handlers.handlePhase);
    expect(approach.status).toBe(200);
    const code = await post("/api/adventure/phase", { attempt_id: id, phase: "code", code: "function f(){}", language: "javascript" }, handlers.handlePhase);
    expect(code.status).toBe(200); // the one extra request
    const blocked = await post("/api/adventure/followups", { attempt_id: id }, handlers.handleFollowups);
    expect(blocked.status).toBe(503);
    expect(ai.calls.followups).toBe(0);
  });
});

describe("a level from start to finish", () => {
  it("scores each step from the AI, stores it, then closes the attempt and pays the level reward once", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi({ approach: 80, code: 90, defend: 70 });
    const deps = makeDeps(db, user, ai);
    const r = await play(deps, "sv_1");

    expect(r.a.body).toMatchObject({ recorded: true, finished: false, next_phase: "code" });
    expect(r.a.body.phase).toMatchObject({ phase: "approach", score: 80 });
    expect(r.c.body).toMatchObject({ recorded: true, finished: false, next_phase: "defend" });
    expect(r.f.body.followups).toHaveLength(2);
    expect(r.d.body).toMatchObject({ recorded: true, finished: true, next_phase: null });
    expect(r.d.body.result).toMatchObject({ passed: true, victory: false, first_completion: true, xp_gained: 30, coins_gained: 10 });
    expect(r.d.body.result.overall).toBe(Math.round(0.3 * 80 + 0.4 * 90 + 0.3 * 70));
    expect(await xp(user)).toBe(30);

    const view = await attemptOf(deps, r.id);
    expect(view.body).toMatchObject({ status: "passed", xp_awarded: 30, coins_awarded: 10, first_completion: true, hp_total: 10 });
    expect(view.body.phases.map((p: { phase: string }) => p.phase)).toEqual(["approach", "code", "defend"]);
  });

  it("unlocks the next level only after a pass", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    expect((await start(deps, { level_id: "sv_2" })).status).toBe(403);
    await play(deps, "sv_1");
    expect((await start(deps, { level_id: "sv_2" })).status).toBe(200);
    expect((await start(deps, { level_id: "sv_3" })).status).toBe(403);
  });

  it("steps must go in order", async () => {
    const user = await db.newUser();
    const deps = makeDeps(db, user, makeFakeAi());
    const { body } = await start(deps, { level_id: "sv_1" });
    const id = body.attempt_id;
    const early = await phase(deps, { attempt_id: id, phase: "code", code: "function f(){}", language: "javascript" });
    expect(early.status).toBe(409);
    expect((await followups(deps, { attempt_id: id })).status).toBe(409);
    expect((await phase(deps, { attempt_id: id, phase: "defend", answers: ["a"] })).status).toBe(409);
  });

  it("the defend answers must match the stored follow-up questions", async () => {
    const user = await db.newUser();
    const deps = makeDeps(db, user, makeFakeAi());
    const id = (await start(deps, { level_id: "sv_1" })).body.attempt_id;
    await phase(deps, { attempt_id: id, phase: "approach", approach_text: "Loop and add them up." });
    await phase(deps, { attempt_id: id, phase: "code", code: "function f(xs){return xs.length}", language: "javascript" });
    await followups(deps, { attempt_id: id });
    const short = await phase(deps, { attempt_id: id, phase: "defend", answers: ["only one answer"] });
    expect(short.status).toBe(400);
  });

  it("ignores scores, HP, XP, unlock flags and level changes sent by the browser", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi({ approach: 10, code: 10, defend: 10 });
    const deps = makeDeps(db, user, ai);
    const id = (await start(deps, { level_id: "sv_1" })).body.attempt_id;
    const a = await phase(deps, {
      attempt_id: id, phase: "approach", approach_text: "I would try something.",
      score: 100, hp: 0, damage: 10, xp: 9999, coins: 9999, passed: true, unlocked: ["boss_slayer"], overall: 100,
    });
    expect(a.body.phase.score).toBe(10);
    expect(a.body.hp).toBe(bossHp({ approach: 10 }));
    await phase(deps, { attempt_id: id, phase: "code", code: "function f(){}", language: "javascript", score: 100 });
    await followups(deps, { attempt_id: id });
    const d = await phase(deps, { attempt_id: id, phase: "defend", answers: ["x", "y"], score: 100, passed: true, xp: 9999 });
    expect(d.body.result).toMatchObject({ passed: false, xp_gained: 0, coins_gained: 0 });
    expect(await xp(user)).toBe(0);
    expect(await count("select count(*) from public.player_achievements where user_id = $1", [user])).toBe(0);
    expect((await db.pool.query("select score from public.adventure_phases where attempt_id = $1 order by created_at", [id])).rows.map((r) => r.score)).toEqual([10, 10, 10]);
  });
});

describe("double submits and retries never pay twice", () => {
  it("re-sending the last step returns the stored result and pays once", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    const r = await play(deps, "sv_1");
    const scoreCalls = ai.calls.score;
    const again = await phase(deps, { attempt_id: r.id, phase: "defend", answers: ["different", "answers"] });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ recorded: false, finished: true });
    expect(ai.calls.score).toBe(scoreCalls); // not scored again
    expect(await xp(user)).toBe(30);
    expect(await count("select count(*) from public.xp_transactions where user_id = $1", [user])).toBe(1);
  });

  it("five simultaneous submissions of the last step pay once", async () => {
    const user = await db.newUser();
    const deps = makeDeps(db, user, makeFakeAi());
    const id = (await start(deps, { level_id: "sv_1" })).body.attempt_id;
    await phase(deps, { attempt_id: id, phase: "approach", approach_text: "Loop and add them up." });
    await phase(deps, { attempt_id: id, phase: "code", code: "function f(xs){return 1}", language: "javascript" });
    await followups(deps, { attempt_id: id });
    const results = await Promise.all(Array.from({ length: 5 }, () => phase(deps, { attempt_id: id, phase: "defend", answers: ["a", "b"] })));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(await xp(user)).toBe(30);
    expect(await count("select count(*) from public.adventure_phases where attempt_id = $1", [id])).toBe(3);
    expect(await count("select count(*) from public.xp_transactions where user_id = $1", [user])).toBe(1);
  });

  it("finish is safe to call repeatedly", async () => {
    const user = await db.newUser();
    const deps = makeDeps(db, user, makeFakeAi());
    const r = await play(deps, "sv_1");
    const a = await finish(deps, { attempt_id: r.id });
    const b = await finish(deps, { attempt_id: r.id });
    expect(a.status).toBe(200);
    expect(b.body.attempt.status).toBe("passed");
    expect(await xp(user)).toBe(30);
  });

  it("a replay of a cleared level pays nothing", async () => {
    const user = await db.newUser();
    const deps = makeDeps(db, user, makeFakeAi());
    await play(deps, "sv_1");
    const replay = await play(deps, "sv_1");
    expect(replay.d.body.result).toMatchObject({ passed: true, first_completion: false, xp_gained: 0, coins_gained: 0 });
    expect(await xp(user)).toBe(30);
  });

  it("a stuck attempt (all steps stored, not closed) is closed by finish without re-scoring", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    const id = (await start(deps, { level_id: "sv_1" })).body.attempt_id;
    // store all three steps directly, as if the connection dropped before the attempt was closed
    await db.rpc("record_adventure_phase", { p_user: user, p_attempt_id: id, p_phase: "approach", p_score: 80, p_feedback: "ok", p_submission: {} });
    await db.rpc("record_adventure_phase", { p_user: user, p_attempt_id: id, p_phase: "code", p_score: 80, p_feedback: "ok", p_submission: {} });
    await db.rpc("store_adventure_followups", { p_user: user, p_attempt_id: id, p_followups: ["Why?"] });
    await db.rpc("record_adventure_phase", { p_user: user, p_attempt_id: id, p_phase: "defend", p_score: 80, p_feedback: "ok", p_submission: {} });
    expect((await attemptOf(deps, id)).body.status).toBe("in_progress");
    const done = await finish(deps, { attempt_id: id });
    expect(done.body.attempt.status).toBe("passed");
    expect(done.body.result).toMatchObject({ passed: true, xp_gained: 30 });
    expect(ai.calls.score).toBe(0);
  });
});

describe("failing is fair", () => {
  it("a failed attempt pays nothing, doesn't unlock, and doesn't block a retry", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi({ approach: 20, code: 20, defend: 20 });
    const deps = makeDeps(db, user, ai);
    const failed = await play(deps, "sv_1");
    expect(failed.d.body.result).toMatchObject({ passed: false, xp_gained: 0 });
    expect(await xp(user)).toBe(0);
    expect((await start(deps, { level_id: "sv_2" })).status).toBe(403);

    ai.scores = { approach: 85, code: 85, defend: 85 };
    const retry = await play(deps, "sv_1");
    expect(retry.d.body.result).toMatchObject({ passed: true, first_completion: true, xp_gained: 30 });
    expect(await xp(user)).toBe(30);
  });

  it("passing right at the fairness margin counts as a pass", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi({ approach: 57, code: 57, defend: 57 });
    const r = await play(makeDeps(db, user, ai), "sv_1");
    expect(r.d.body.result).toMatchObject({ passed: true, overall: 57 });
    const user2 = await db.newUser();
    const ai2 = makeFakeAi({ approach: 56, code: 56, defend: 56 });
    const r2 = await play(makeDeps(db, user2, ai2), "sv_1");
    expect(r2.d.body.result).toMatchObject({ passed: false, overall: 56 });
  });

  it("Comeback unlocks when a level that was failed is later passed", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi({ approach: 20, code: 20, defend: 20 });
    const deps = makeDeps(db, user, ai);
    await play(deps, "sv_1");
    ai.scores = { approach: 80, code: 80, defend: 80 };
    const pass = await play(deps, "sv_1");
    expect(pass.d.body.result.unlocked.map((a: { id: string }) => a.id)).toContain("comeback");
  });
});

describe("AI failures never cost the player", () => {
  it("if scoring fails nothing is stored or counted, and the same step can be tried again", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    const id = (await start(deps, { level_id: "sv_1" })).body.attempt_id;

    ai.fail.score = true;
    const failed = await phase(deps, { attempt_id: id, phase: "approach", approach_text: "Loop and add them up." });
    expect(failed.status).toBe(502);
    expect(failed.body).toMatchObject({ reason: "ai_failed", retryable: true });
    expect(await count("select count(*) from public.adventure_phases where attempt_id = $1", [id])).toBe(0);
    const prog = (await db.pool.query("select failed_attempts from public.player_level_progress where user_id = $1 and level_id = 'sv_1'", [user])).rows[0];
    expect(prog.failed_attempts).toBe(0);
    expect((await attemptOf(deps, id)).body.status).toBe("in_progress");

    ai.fail.score = false;
    const ok = await phase(deps, { attempt_id: id, phase: "approach", approach_text: "Loop and add them up." });
    expect(ok.status).toBe(200);
    expect(ok.body.recorded).toBe(true);
  });

  it("if the follow-up questions can't be written, the player can ask again", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    const id = (await start(deps, { level_id: "sv_1" })).body.attempt_id;
    await phase(deps, { attempt_id: id, phase: "approach", approach_text: "Loop and add them up." });
    await phase(deps, { attempt_id: id, phase: "code", code: "function f(){}", language: "javascript" });
    ai.fail.followups = true;
    expect((await followups(deps, { attempt_id: id })).status).toBe(502);
    ai.fail.followups = false;
    const ok = await followups(deps, { attempt_id: id });
    expect(ok.status).toBe(200);
    // asking again returns the same stored questions without another AI call
    const calls = ai.calls.followups;
    expect((await followups(deps, { attempt_id: id })).body.followups).toEqual(ok.body.followups);
    expect(ai.calls.followups).toBe(calls);
  });
});

describe("hints", () => {
  it("one hint per step: the second request returns the first and calls no AI", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    const id = (await start(deps, { level_id: "sv_1" })).body.attempt_id;
    const first = await hint(deps, { attempt_id: id, phase: "approach", draft: "Maybe a loop?" });
    expect(first.status).toBe(200);
    expect(first.body.granted).toBe(true);
    const calls = ai.calls.hint;
    const second = await hint(deps, { attempt_id: id, phase: "approach" });
    expect(second.body).toEqual({ hint_text: first.body.hint_text, granted: false });
    expect(ai.calls.hint).toBe(calls);
    expect(await count("select count(*) from public.adventure_hints where attempt_id = $1", [id])).toBe(1);
  });

  it("only for the step you're on, and not after the attempt is over", async () => {
    const user = await db.newUser();
    const deps = makeDeps(db, user, makeFakeAi());
    const id = (await start(deps, { level_id: "sv_1" })).body.attempt_id;
    expect((await hint(deps, { attempt_id: id, phase: "code" })).status).toBe(409);
    const r = await play(deps, "sv_1");
    expect((await hint(deps, { attempt_id: r.id, phase: "approach" })).status).toBe(409);
  });

  it("a failed hint doesn't use up the player's hint", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    const id = (await start(deps, { level_id: "sv_1" })).body.attempt_id;
    ai.fail.hint = true;
    expect((await hint(deps, { attempt_id: id, phase: "approach" })).status).toBe(502);
    ai.fail.hint = false;
    expect((await hint(deps, { attempt_id: id, phase: "approach" })).body.granted).toBe(true);
  });

  it("using a hint withholds No Training Wheels but not the pass", async () => {
    const user = await db.newUser();
    const ai = makeFakeAi({ approach: 80, code: 80, defend: 80 });
    const deps = makeDeps(db, user, ai);
    const id = (await start(deps, { level_id: "sv_1" })).body.attempt_id;
    await hint(deps, { attempt_id: id, phase: "approach" });
    await phase(deps, { attempt_id: id, phase: "approach", approach_text: "Loop and add them up." });
    await phase(deps, { attempt_id: id, phase: "code", code: "function f(){}", language: "javascript" });
    await followups(deps, { attempt_id: id });
    const d = await phase(deps, { attempt_id: id, phase: "defend", answers: ["a", "b"] });
    expect(d.body.result.passed).toBe(true);
    expect(d.body.result.unlocked.map((a: { id: string }) => a.id)).not.toContain("no_training_wheels");
    const next = await play(deps, "sv_2");
    expect(next.d.body.result.unlocked.map((a: { id: string }) => a.id)).toContain("no_training_wheels");
  });
});

describe("ownership", () => {
  it("another player can't read, hint, score, follow up or finish someone else's attempt", async () => {
    const owner = await db.newUser();
    const other = await db.newUser();
    const id = (await start(makeDeps(db, owner, makeFakeAi()), { level_id: "sv_1" })).body.attempt_id;
    const deps = makeDeps(db, other, makeFakeAi());
    expect((await attemptOf(deps, id)).status).toBe(404);
    expect((await hint(deps, { attempt_id: id, phase: "approach" })).status).toBe(404);
    expect((await phase(deps, { attempt_id: id, phase: "approach", approach_text: "hello world" })).status).toBe(404);
    expect((await followups(deps, { attempt_id: id })).status).toBe(404);
    expect((await finish(deps, { attempt_id: id })).status).toBe(404);
    expect(await count("select count(*) from public.adventure_phases where attempt_id = $1", [id])).toBe(0);
  });

  it("everything needs sign-in and a valid body", async () => {
    const deps = makeDeps(db, null, makeFakeAi());
    expect((await attemptOf(deps, "00000000-0000-4000-8000-000000000000")).status).toBe(401);
    expect((await hint(deps, {})).status).toBe(401);
    const user = await db.newUser();
    const signed = makeDeps(db, user, makeFakeAi());
    expect((await attemptOf(signed, "not-a-uuid")).status).toBe(400);
    expect((await phase(signed, { attempt_id: "x", phase: "approach" })).status).toBe(400);
    expect((await phase(signed, { attempt_id: "00000000-0000-4000-8000-000000000000", phase: "bogus" })).status).toBe(400);
  });

  it("enforces input size limits", async () => {
    const user = await db.newUser();
    const deps = makeDeps(db, user, makeFakeAi());
    const id = (await start(deps, { level_id: "sv_1" })).body.attempt_id;
    const huge = await phase(deps, { attempt_id: id, phase: "approach", approach_text: "x".repeat(ADVENTURE.limits.approach + 1) });
    expect(huge.status).toBe(400);
  });
});

describe("the boss battle", () => {
  async function toBoss(user: string) {
    for (const l of LEVELS) await playLevel(db, user, l);
  }

  it("is locked until all five levels are done, even by direct API call", async () => {
    const user = await db.newUser();
    const deps = makeDeps(db, user, makeFakeAi());
    for (let i = 0; i < 4; i++) await playLevel(db, user, LEVELS[i]);
    expect((await start(deps, { level_id: BOSS })).status).toBe(403);
    await playLevel(db, user, LEVELS[4]);
    expect((await start(deps, { level_id: BOSS })).status).toBe(200);
  });

  it("HP after each step comes only from the stored score for that step", async () => {
    const user = await db.newUser();
    await toBoss(user);
    const ai = makeFakeAi({ approach: 70, code: 80, defend: 70 });
    const deps = makeDeps(db, user, ai);
    const id = (await start(deps, { level_id: BOSS })).body.attempt_id;
    expect(ai.lastQuestionInput?.level.is_boss).toBe(true);

    const a = await phase(deps, { attempt_id: id, phase: "approach", approach_text: "Read it line by line.", hp: 0, damage: 99 });
    expect(a.body.hp).toBe(bossHp({ approach: 70 }));
    expect(a.body.phase.damage).toBe(3);
    const c = await phase(deps, { attempt_id: id, phase: "code", code: "function f(){}", language: "javascript" });
    expect(c.body.hp).toBe(bossHp({ approach: 70, code: 80 }));
    await followups(deps, { attempt_id: id });
    const d = await phase(deps, { attempt_id: id, phase: "defend", answers: ["a", "b"] });
    expect(d.body.hp).toBe(0);
    expect(d.body.result).toMatchObject({ passed: true, victory: true, first_completion: true, xp_gained: 150, coins_gained: 50 });
    const unlocked = d.body.result.unlocked.map((x: { id: string }) => x.id);
    expect(unlocked).toEqual(expect.arrayContaining(["boss_slayer", "world_explorer"]));
    expect((await attemptOf(deps, id)).body.unlocked.map((x: { id: string }) => x.id)).toEqual(expect.arrayContaining(["boss_slayer"]));
  });

  it("a passing average is not enough if the boss still has HP left", async () => {
    const user = await db.newUser();
    await toBoss(user);
    const ai = makeFakeAi({ approach: 100, code: 50, defend: 100 });
    const deps = makeDeps(db, user, ai);
    const r = await play(deps, BOSS);
    expect(r.d.body.hp).toBe(2);
    expect(r.d.body.result).toMatchObject({ passed: false, victory: false, xp_gained: 0 });
    // and the boss stays locked-in as unbeaten
    ai.scores = { approach: 80, code: 80, defend: 80 };
    const win = await play(deps, BOSS);
    expect(win.d.body.result).toMatchObject({ victory: true, first_completion: true, xp_gained: 150 });
  });

  it("defeating the boss twice pays once", async () => {
    const user = await db.newUser();
    await toBoss(user);
    const before = await xp(user);
    const deps = makeDeps(db, user, makeFakeAi({ approach: 90, code: 90, defend: 90 }));
    await play(deps, BOSS);
    const again = await play(deps, BOSS);
    expect(again.d.body.result.xp_gained).toBe(0);
    expect(await xp(user)).toBe(before + 150);
  });
});

describe("start retries an unusable question", () => {
  it("a bad first generation is replaced by the next one and the player is charged once", async () => {
    enforceLimits(2);
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    const good = ai.generateQuestion;
    let tries = 0;
    ai.generateQuestion = async (input) => {
      if (tries++ === 0) throw new Error("The exercise gave the bugs away.");
      return good(input);
    };
    const first = await start(deps, { level_id: "sv_1" });
    expect(first.status).toBe(200);
    expect(tries).toBe(2);
    expect((await start(deps, { level_id: "sv_1" })).status).toBe(200); // one start was used, not two
    expect((await start(deps, { level_id: "sv_1" })).status).toBe(429); // limit of 2 reached
  });

  it("three unusable generations in a row give a retryable error and no charge", async () => {
    enforceLimits(1);
    const user = await db.newUser();
    const ai = makeFakeAi();
    const deps = makeDeps(db, user, ai);
    ai.generateQuestion = async () => {
      throw new Error("The exercise gave the bugs away.");
    };
    const failed = await start(deps, { level_id: "sv_1" });
    expect(failed.status).toBe(502);
    expect(failed.body).toMatchObject({ reason: "ai_failed", retryable: true });
    ai.generateQuestion = makeFakeAi().generateQuestion;
    expect((await start(deps, { level_id: "sv_1" })).status).toBe(200);
  });
});
