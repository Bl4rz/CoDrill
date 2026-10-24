import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDb, type TestDb } from "../helpers/db";
import { completeQuestion, issueRun, type HubRaw, type RunSummaryRaw } from "../helpers/fixtures";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});

type Reward = { granted: boolean; xp_gained: number; coins_gained: number; total_xp: number; level: number; previous_level: number; coins: number };

const grant = (user: string, xp: number, coins: number, sourceId: string, sourceType = "test") =>
  db.rpc<Reward>("grant_rewards", {
    p_user: user,
    p_xp: xp,
    p_coins: coins,
    p_reason: "question_completed",
    p_source_type: sourceType,
    p_source_id: sourceId,
  });

const state = async (user: string) =>
  (await db.pool.query("select total_xp, level, coins from public.player_progression where user_id = $1", [user])).rows[0];
const count = async (table: string, user: string) =>
  Number((await db.pool.query(`select count(*) from public.${table} where user_id = $1`, [user])).rows[0].count);

describe("granting XP and coins is idempotent", () => {
  it("pays once for a source and ignores the retry", async () => {
    const user = await db.newUser();
    const first = await grant(user, 40, 5, "src-1");
    expect(first).toMatchObject({ granted: true, xp_gained: 40, coins_gained: 5, total_xp: 40, coins: 5, level: 1 });

    const retry = await grant(user, 40, 5, "src-1");
    expect(retry).toMatchObject({ granted: false, xp_gained: 0, coins_gained: 0, total_xp: 40, coins: 5 });

    expect(await state(user)).toEqual({ total_xp: 40, level: 1, coins: 5 });
    expect(await count("xp_transactions", user)).toBe(1);
    expect(await count("coin_transactions", user)).toBe(1);
  });

  it("a retry with a bigger amount still pays nothing", async () => {
    const user = await db.newUser();
    await grant(user, 10, 1, "src-x");
    const cheat = await grant(user, 200, 100, "src-x");
    expect(cheat.granted).toBe(false);
    expect(await state(user)).toEqual({ total_xp: 10, level: 1, coins: 1 });
  });

  it("different sources each pay, and the level moves when XP crosses a boundary", async () => {
    const user = await db.newUser();
    await grant(user, 90, 0, "a");
    const up = await grant(user, 20, 0, "b");
    expect(up).toMatchObject({ granted: true, previous_level: 1, level: 2, total_xp: 110 });
    // the same source id under a different source TYPE is a different source
    const other = await grant(user, 5, 0, "a", "quest");
    expect(other.granted).toBe(true);
    expect(await count("xp_transactions", user)).toBe(3);
  });

  it("skips the coin ledger row when no coins are paid", async () => {
    const user = await db.newUser();
    await grant(user, 10, 0, "no-coins");
    expect(await count("coin_transactions", user)).toBe(0);
  });

  it("refuses amounts outside the sanity limits and changes nothing", async () => {
    const user = await db.newUser();
    await expect(grant(user, 0, 0, "z")).rejects.toThrow(/invalid xp amount/);
    await expect(grant(user, -5, 0, "z")).rejects.toThrow(/invalid xp amount/);
    await expect(grant(user, 201, 0, "z")).rejects.toThrow(/invalid xp amount/);
    await expect(grant(user, 10, 101, "z")).rejects.toThrow(/invalid coin amount/);
    await expect(grant(user, 10, -1, "z")).rejects.toThrow(/invalid coin amount/);
    expect(await count("xp_transactions", user)).toBe(0);
  });

  it("the ledgers are append-only: rows cannot be edited", async () => {
    const user = await db.newUser();
    await grant(user, 10, 5, "led");
    await expect(
      db.pool.query("update public.xp_transactions set amount = 9999 where user_id = $1", [user]),
    ).rejects.toThrow(/append-only/);
    await expect(
      db.pool.query("update public.coin_transactions set amount = 9999 where user_id = $1", [user]),
    ).rejects.toThrow(/append-only/);
  });
});

describe("concurrent awards (real parallel connections)", () => {
  it("20 simultaneous grants for the same source pay exactly once", async () => {
    const user = await db.newUser();
    const results = await Promise.all(Array.from({ length: 20 }, () => grant(user, 25, 5, "race-same")));
    expect(results.filter((r) => r.granted)).toHaveLength(1);
    expect(await state(user)).toEqual({ total_xp: 25, level: 1, coins: 5 });
    expect(await count("xp_transactions", user)).toBe(1);
    expect(await count("coin_transactions", user)).toBe(1);
  });

  it("20 simultaneous grants for 20 different sources lose no updates", async () => {
    const user = await db.newUser();
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => grant(user, 10, 1, `race-${i}`)));
    expect(results.every((r) => r.granted)).toBe(true);
    expect(await state(user)).toEqual({ total_xp: 200, level: 2, coins: 20 });
    expect(await count("xp_transactions", user)).toBe(20);
  });

  it("two simultaneous grants that both cross a level boundary level up once", async () => {
    const user = await db.newUser();
    await grant(user, 95, 0, "setup");
    const [a, b] = await Promise.all([grant(user, 10, 0, "p1"), grant(user, 10, 0, "p2")]);
    expect([a.granted, b.granted]).toEqual([true, true]);
    // exactly one of them saw the 1 -> 2 transition
    expect([a, b].filter((r) => r.previous_level === 1 && r.level === 2)).toHaveLength(1);
    expect((await state(user)).total_xp).toBe(115);
  });

  it("ten parallel completions of the same question store one result and pay once", async () => {
    const user = await db.newUser();
    const run = await issueRun(db, user);
    const results = await Promise.all(Array.from({ length: 10 }, () => completeQuestion(db, user, run, 0)));
    expect(results.filter((r) => r.recorded)).toHaveLength(1);
    expect(results.filter((r) => r.reward.granted)).toHaveLength(1);
    expect(await count("question_results", user)).toBe(1);
    expect(await state(user)).toEqual({ total_xp: 30, level: 1, coins: 5 });
  });
});

describe("completing a question", () => {
  it("stores the result and pays in one step, then a retry pays nothing", async () => {
    const user = await db.newUser();
    const run = await issueRun(db, user);
    const first = await completeQuestion(db, user, run, 0);
    expect(first.recorded).toBe(true);
    expect(first.reward).toMatchObject({ granted: true, xp_gained: 30, coins_gained: 5, total_xp: 30 });

    const retry = await completeQuestion(db, user, run, 0);
    expect(retry.recorded).toBe(false);
    expect(retry.reward).toMatchObject({ granted: false, xp_gained: 0, total_xp: 30, coins: 5 });
    expect(await count("question_results", user)).toBe(1);
    expect(await count("xp_transactions", user)).toBe(1);
  });

  it("a retry returns the originally stored scores, not the new ones", async () => {
    const user = await db.newUser();
    const run = await issueRun(db, user);
    await completeQuestion(db, user, run, 0, { p_correctness: 40, p_communication: 41, p_reasoning: 42, p_language: "python" });
    const retry = await completeQuestion(db, user, run, 0, { p_correctness: 100, p_communication: 100, p_reasoning: 100, p_language: "java" });
    expect(retry.scores).toEqual({ correctness: 40, communication: 41, reasoning: 42 });
    expect(retry.language).toBe("python");
  });

  it("takes difficulty and topic from what the server issued, not from the caller", async () => {
    const user = await db.newUser();
    const run = await issueRun(db, user, { difficulties: ["hard"] });
    await completeQuestion(db, user, run, 0);
    const { rows } = await db.pool.query("select difficulty, topic from public.question_results where user_id = $1", [user]);
    expect(rows[0]).toEqual({ difficulty: "hard", topic: "topic-0" });
  });

  it("rejects a question the server never issued to this user", async () => {
    const alice = await db.newUser();
    const mallory = await db.newUser();
    const run = await issueRun(db, alice);
    // made-up ids
    await expect(
      db.rpc("complete_question", { p_user: mallory, p_session_id: randomUUID(), p_question_id: randomUUID(), p_language: "java", p_correctness: 100, p_communication: 100, p_reasoning: 100, p_xp: 45, p_coins: 10 }),
    ).rejects.toThrow(/question_not_issued/);
    // someone else's real ids
    await expect(completeQuestion(db, mallory, run, 0)).rejects.toThrow(/question_not_issued/);
    // right session id, wrong question id
    await expect(
      db.rpc("complete_question", { p_user: alice, p_session_id: run.sessionId, p_question_id: randomUUID(), p_language: "java", p_correctness: 1, p_communication: 1, p_reasoning: 1, p_xp: 1, p_coins: 0 }),
    ).rejects.toThrow(/question_not_issued/);
    expect(await count("question_results", mallory)).toBe(0);
    expect(await count("xp_transactions", mallory)).toBe(0);
  });

  it("is atomic: a failed payout leaves no stored result, so a valid retry still works", async () => {
    const user = await db.newUser();
    const run = await issueRun(db, user);
    await expect(completeQuestion(db, user, run, 0, { p_xp: 999 })).rejects.toThrow(/invalid xp amount/);
    expect(await count("question_results", user)).toBe(0);
    const ok = await completeQuestion(db, user, run, 0);
    expect(ok.recorded).toBe(true);
    expect(ok.reward.granted).toBe(true);
  });

  it("rejects out-of-range scores and unknown languages", async () => {
    const user = await db.newUser();
    const run = await issueRun(db, user);
    await expect(completeQuestion(db, user, run, 0, { p_correctness: 101 })).rejects.toThrow();
    await expect(completeQuestion(db, user, run, 0, { p_reasoning: -1 })).rejects.toThrow();
    await expect(completeQuestion(db, user, run, 0, { p_language: "cobol" })).rejects.toThrow();
    expect(await count("question_results", user)).toBe(0);
  });

  it("pays every question in a run once, each question separately", async () => {
    const user = await db.newUser();
    const run = await issueRun(db, user, { difficulties: ["easy", "medium", "hard", "easy"] });
    for (let i = 0; i < 4; i++) await completeQuestion(db, user, run, i);
    expect(await state(user)).toEqual({ total_xp: 120, level: 2, coins: 20 });
  });
});

describe("the repeat-posting rule inputs", () => {
  const ctx = (user: string, run: { sessionId: string; questionIds: string[] }) =>
    db.rpc<{ difficulty: string; prior_runs_of_posting: number; already_completed: boolean }>("get_question_context", {
      p_user: user,
      p_session_id: run.sessionId,
      p_question_id: run.questionIds[0],
    });

  it("a first run has no prior runs; a later run of the same posting sees the earlier finished one", async () => {
    const user = await db.newUser();
    const first = await issueRun(db, user, { hash: "same-job" });
    expect((await ctx(user, first)).prior_runs_of_posting).toBe(0);
    await completeQuestion(db, user, first, 0);

    const second = await issueRun(db, user, { hash: "same-job" });
    expect((await ctx(user, second)).prior_runs_of_posting).toBe(1);
  });

  it("an abandoned earlier run (nothing finished) does not count", async () => {
    const user = await db.newUser();
    await issueRun(db, user, { hash: "abandoned" });
    const second = await issueRun(db, user, { hash: "abandoned" });
    expect((await ctx(user, second)).prior_runs_of_posting).toBe(0);
  });

  it("a different posting, or a different user's run of the same posting, does not count", async () => {
    const a = await db.newUser();
    const b = await db.newUser();
    const bRun = await issueRun(db, b, { hash: "shared" });
    await completeQuestion(db, b, bRun, 0);
    await issueRun(db, a, { hash: "other-job" });
    const aRun = await issueRun(db, a, { hash: "shared" });
    expect((await ctx(a, aRun)).prior_runs_of_posting).toBe(0);
  });

  it("reports whether the question was already completed", async () => {
    const user = await db.newUser();
    const run = await issueRun(db, user);
    expect((await ctx(user, run)).already_completed).toBe(false);
    await completeQuestion(db, user, run, 0);
    expect((await ctx(user, run)).already_completed).toBe(true);
  });
});

/** Move a ledger row in time. The ledger is append-only, so the guard is switched off just for this setup step. */
async function backdate(sql: string, params: unknown[]) {
  await db.pool.query("alter table public.xp_transactions disable trigger xp_transactions_no_update");
  try {
    await db.pool.query(sql, params);
  } finally {
    await db.pool.query("alter table public.xp_transactions enable trigger xp_transactions_no_update");
  }
}

describe("hub and run summary read real rows only", () => {
  it("a brand new player has zeros and empty lists, not demo data", async () => {
    const user = await db.newUser();
    const hub = await db.rpc<HubRaw>("get_hub", { p_user: user, p_day: "2026-10-24" });
    expect(hub.progression).toMatchObject({ total_xp: 0, level: 1, coins: 0 });
    expect(hub.quests).toEqual([]);
    expect(hub.recent_runs).toEqual([]);
    expect(hub.achievements).toEqual([]);
  });

  it("lists the last 5 runs newest first with real totals", async () => {
    const user = await db.newUser();
    const runs = [];
    for (let i = 0; i < 6; i++) {
      runs.push(await issueRun(db, user, { role: `Role ${i}`, difficulties: ["easy", "medium"] }));
      await db.pool.query("update public.issued_runs set created_at = now() - make_interval(mins => $2) where session_id = $1", [
        runs[i].sessionId,
        60 - i * 10,
      ]);
    }
    await completeQuestion(db, user, runs[5], 0, { p_correctness: 90, p_communication: 60, p_reasoning: 60, p_xp: 40 });
    const hub = await db.rpc<HubRaw>("get_hub", { p_user: user, p_day: "2026-10-24" });
    expect(hub.recent_runs).toHaveLength(5);
    expect(hub.recent_runs[0]).toMatchObject({
      role_title: "Role 5",
      questions_total: 2,
      questions_done: 1,
      avg_score: 70,
      xp_earned: 40,
    });
    expect(hub.recent_runs[1]).toMatchObject({ role_title: "Role 4", questions_done: 0, avg_score: null, xp_earned: 0 });
    expect(hub.recent_runs.some((r) => r.role_title === "Role 0")).toBe(false);
  });

  it("summarises one run's XP and the player's current level", async () => {
    const user = await db.newUser();
    const run = await issueRun(db, user, { difficulties: ["easy", "easy", "easy"] });
    await completeQuestion(db, user, run, 0, { p_xp: 60, p_coins: 5 });
    await completeQuestion(db, user, run, 1, { p_xp: 60, p_coins: 5 });
    const summary = await db.rpc<RunSummaryRaw>("get_run_summary", { p_user: user, p_session_id: run.sessionId });
    expect(summary).toMatchObject({ questions_total: 3, questions_done: 2, xp_earned: 120, coins_earned: 10, total_xp: 120, level: 2 });
  });

  it("separates this run's XP from XP earned before or after it (for the level-up dialog)", async () => {
    const user = await db.newUser();
    // 60 XP from something else, earlier
    await grant(user, 60, 0, "earlier");
    await backdate("update public.xp_transactions set created_at = now() - interval '2 hours' where user_id = $1", [user]);

    const run = await issueRun(db, user, { difficulties: ["easy", "easy"] });
    await completeQuestion(db, user, run, 0, { p_xp: 30 });
    await completeQuestion(db, user, run, 1, { p_xp: 30 }); // 120 total: crosses level 2 at 100 during the run
    // a quest claimed afterwards pushes the player further, but is not part of the run
    await grant(user, 110, 0, "later-quest", "quest");
    await backdate(
      "update public.xp_transactions set created_at = now() + interval '1 hour' where user_id = $1 and source_type = 'quest'",
      [user],
    );

    const s = await db.rpc<RunSummaryRaw>("get_run_summary", { p_user: user, p_session_id: run.sessionId });
    expect(s.xp_before_run).toBe(60);
    expect(s.xp_at_run_end).toBe(120);
    expect(s.xp_earned).toBe(60);
    expect(s.total_xp).toBe(230);
  });

  it("a run with no finished questions reports zeros", async () => {
    const user = await db.newUser();
    const run = await issueRun(db, user);
    const s = await db.rpc<RunSummaryRaw>("get_run_summary", { p_user: user, p_session_id: run.sessionId });
    expect(s).toMatchObject({ questions_done: 0, xp_earned: 0, xp_before_run: 0, xp_at_run_end: 0 });
  });
});
