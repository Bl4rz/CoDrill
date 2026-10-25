import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDb, type TestDb } from "../helpers/db";
import {
  BOSS,
  LEVELS,
  finalizeAttempt,
  playLevel,
  scoreAll,
  scorePhase,
  startAttempt,
  storeFollowups,
  type AdventureRaw,
  type AdventureStatsAll,
} from "../helpers/fixtures";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});

const adventure = (user: string) => db.rpc<AdventureRaw>("get_adventure", { p_user: user, p_world: "syntax_valley" });
const statuses = async (user: string) => Object.fromEntries((await adventure(user)).levels.map((l) => [l.id, l.status]));
const xp = async (user: string) =>
  Number((await db.pool.query("select coalesce(total_xp, 0) as x from public.player_progression where user_id = $1", [user])).rows[0]?.x ?? 0);
const count = async (sql: string, params: unknown[]) => Number((await db.pool.query(sql, params)).rows[0].count);
const attempts = (user: string) => count("select count(*) from public.adventure_attempts where user_id = $1", [user]);

describe("seed data", () => {
  it("has one world with five levels and one boss, in order, with sensible rewards", async () => {
    const { rows: worlds } = await db.pool.query("select id, title from public.worlds");
    expect(worlds).toEqual([{ id: "syntax_valley", title: "Syntax Valley" }]);

    const { rows } = await db.pool.query("select * from public.levels order by order_index");
    expect(rows.map((r) => r.id)).toEqual(["sv_1", "sv_2", "sv_3", "sv_4", "sv_5", "sv_boss"]);
    expect(rows.map((r) => r.order_index)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rows.filter((r) => r.is_boss).map((r) => r.id)).toEqual(["sv_boss"]);
    expect(rows.find((r) => r.is_boss).title).toBe("The Debug Goblin");
    for (const r of rows) {
      expect(r.topic.length).toBeGreaterThan(3);
      expect(r.reward_xp).toBeGreaterThan(0);
      expect(r.reward_xp).toBeLessThanOrEqual(200);
    }
    // the ramp goes up, and the boss pays the most
    const rewards = rows.map((r) => r.reward_xp);
    expect(rewards).toEqual([...rewards].sort((a, b) => a - b));
    expect(rows.find((r) => r.is_boss).reward_xp).toBe(Math.max(...rewards));
  });

  it("topics are fixed per level and match the plan", async () => {
    const { rows } = await db.pool.query("select id, topic, difficulty from public.levels order by order_index");
    expect(rows.slice(0, 5).map((r) => r.topic)).toEqual([
      "variables and loops",
      "strings",
      "arrays",
      "simple functions and edge cases",
      "debugging a broken snippet",
    ]);
    expect(rows.slice(0, 2).every((r) => r.difficulty === "beginner")).toBe(true);
  });
});

describe("unlocking is computed on the server from stored progress", () => {
  it("a new player has only level 1 unlocked", async () => {
    const user = await db.newUser();
    expect(await statuses(user)).toEqual({
      sv_1: "unlocked", sv_2: "locked", sv_3: "locked", sv_4: "locked", sv_5: "locked", sv_boss: "locked",
    });
    expect((await adventure(user)).next_level_id).toBe("sv_1");
  });

  it("starting a locked level is refused in the database and leaves no trace", async () => {
    const user = await db.newUser();
    for (const level of ["sv_2", "sv_3", "sv_5", BOSS]) {
      await expect(startAttempt(db, user, level), level).rejects.toThrow(/level_locked/);
    }
    await expect(startAttempt(db, user, "nope")).rejects.toThrow(/level_not_found/);
    expect(await attempts(user)).toBe(0);
    expect(await count("select count(*) from public.player_level_progress where user_id = $1 and level_id <> 'sv_1'", [user])).toBe(0);
  });

  it("level N+1 unlocks only after level N is completed, one at a time", async () => {
    const user = await db.newUser();
    for (let i = 0; i < LEVELS.length; i++) {
      const before = await statuses(user);
      expect(before[LEVELS[i]]).toBe("unlocked");
      if (i + 1 < LEVELS.length) expect(before[LEVELS[i + 1]]).toBe("locked");
      await playLevel(db, user, LEVELS[i]);
      const after = await statuses(user);
      expect(after[LEVELS[i]]).toBe("completed");
      if (i + 1 < LEVELS.length) expect(after[LEVELS[i + 1]]).toBe("unlocked");
    }
  });

  it("the boss unlocks only when all five levels are done", async () => {
    const user = await db.newUser();
    for (let i = 0; i < 4; i++) await playLevel(db, user, LEVELS[i]);
    expect((await statuses(user)).sv_boss).toBe("locked");
    await expect(startAttempt(db, user, BOSS)).rejects.toThrow(/level_locked/);
    await playLevel(db, user, LEVELS[4]);
    expect((await statuses(user)).sv_boss).toBe("unlocked");
    expect((await adventure(user)).next_level_id).toBe(BOSS);
    await expect(startAttempt(db, user, BOSS)).resolves.toBeTruthy();
  });

  it("completing an early level twice does not skip ahead", async () => {
    const user = await db.newUser();
    await playLevel(db, user, "sv_1");
    await playLevel(db, user, "sv_1");
    expect((await statuses(user)).sv_3).toBe("locked");
    await expect(startAttempt(db, user, "sv_3")).rejects.toThrow(/level_locked/);
  });

  it("failing a level does not unlock the next one", async () => {
    const user = await db.newUser();
    const { result } = await playLevel(db, user, "sv_1", [20, 20, 20]);
    expect(result.passed).toBe(false);
    expect((await statuses(user)).sv_2).toBe("locked");
    expect((await statuses(user)).sv_1).toBe("unlocked");
  });

  it("completing the whole world marks it complete and leaves nothing to recommend", async () => {
    const user = await db.newUser();
    for (const l of [...LEVELS, BOSS]) await playLevel(db, user, l);
    const a = await adventure(user);
    expect(a.world_complete).toBe(true);
    expect(a.completed_count).toBe(6);
    expect(a.next_level_id).toBeNull();
  });

  it("one player's progress does not unlock anything for another", async () => {
    const a = await db.newUser();
    const b = await db.newUser();
    await playLevel(db, a, "sv_1");
    expect((await statuses(b)).sv_2).toBe("locked");
    await expect(startAttempt(db, b, "sv_2")).rejects.toThrow(/level_locked/);
  });
});

describe("rewards: first completion pays once, through the existing ledger", () => {
  it("pays the level's own reward on the first pass and nothing on later passes", async () => {
    const user = await db.newUser();
    const first = await playLevel(db, user, "sv_1");
    expect(first.result).toMatchObject({ finalized: true, passed: true, first_completion: true, xp_gained: 30, coins_gained: 10 });
    expect(await xp(user)).toBe(30);

    const replay = await playLevel(db, user, "sv_1");
    expect(replay.result).toMatchObject({ finalized: true, passed: true, first_completion: false, xp_gained: 0, coins_gained: 0 });
    expect(await xp(user)).toBe(30);
    expect(await count("select count(*) from public.xp_transactions where user_id = $1 and source_type = 'adventure_level'", [user])).toBe(1);
    expect(
      (await db.pool.query("select source_id, reason from public.xp_transactions where user_id = $1 and source_type = 'adventure_level'", [user])).rows[0],
    ).toEqual({ source_id: "sv_1", reason: "adventure_completed" });
  });

  it("finalizing the same attempt twice (double submit) pays once and returns the stored result", async () => {
    const user = await db.newUser();
    const attemptId = await startAttempt(db, user, "sv_1");
    await scoreAll(db, user, attemptId, [80, 80, 80]);
    const a = await finalizeAttempt(db, user, attemptId, [80, 80, 80]);
    const b = await finalizeAttempt(db, user, attemptId, [80, 80, 80]);
    expect(a.finalized).toBe(true);
    expect(b).toMatchObject({ finalized: false, passed: true, first_completion: true, xp_gained: 30 });
    expect(await xp(user)).toBe(30);
  });

  it("ten simultaneous finalizes of one attempt pay exactly once", async () => {
    const user = await db.newUser();
    const attemptId = await startAttempt(db, user, "sv_1");
    await scoreAll(db, user, attemptId, [90, 90, 90]);
    const results = await Promise.all(Array.from({ length: 10 }, () => finalizeAttempt(db, user, attemptId, [90, 90, 90])));
    expect(results.filter((r) => r.finalized)).toHaveLength(1);
    expect(await xp(user)).toBe(30);
    expect(await count("select count(*) from public.xp_transactions where user_id = $1", [user])).toBe(1);
  });

  it("two different attempts on the same level finishing at once: only one is the first completion", async () => {
    const user = await db.newUser();
    const [a1, a2] = [await startAttempt(db, user, "sv_1"), await startAttempt(db, user, "sv_1")];
    await scoreAll(db, user, a1, [90, 90, 90]);
    await scoreAll(db, user, a2, [90, 90, 90]);
    const [r1, r2] = await Promise.all([finalizeAttempt(db, user, a1, [90, 90, 90]), finalizeAttempt(db, user, a2, [90, 90, 90])]);
    expect([r1.first_completion, r2.first_completion].filter(Boolean)).toHaveLength(1);
    expect(await xp(user)).toBe(30);
  });

  it("failing pays nothing and does not penalize; a later pass still pays in full", async () => {
    const user = await db.newUser();
    const fail = await playLevel(db, user, "sv_1", [10, 10, 10]);
    expect(fail.result).toMatchObject({ passed: false, xp_gained: 0, coins_gained: 0 });
    expect(await xp(user)).toBe(0);
    const row = (await db.pool.query("select status, attempts, failed_attempts from public.player_level_progress where user_id = $1 and level_id = 'sv_1'", [user])).rows[0];
    expect(row).toEqual({ status: "unlocked", attempts: 1, failed_attempts: 1 });

    const pass = await playLevel(db, user, "sv_1");
    expect(pass.result).toMatchObject({ passed: true, first_completion: true, xp_gained: 30 });
    expect(await xp(user)).toBe(30);
  });

  it("replay rewards, if configured, are capped by the database and paid once per attempt", async () => {
    const user = await db.newUser();
    await playLevel(db, user, "sv_1");
    const attemptId = await startAttempt(db, user, "sv_1");
    await scoreAll(db, user, attemptId, [90, 90, 90]);
    await expect(finalizeAttempt(db, user, attemptId, [90, 90, 90], { xp: 500 })).rejects.toThrow(/invalid replay amount/);
    const ok = await finalizeAttempt(db, user, attemptId, [90, 90, 90], { xp: 5, coins: 1 });
    expect(ok).toMatchObject({ first_completion: false, xp_gained: 5, coins_gained: 1 });
    const again = await finalizeAttempt(db, user, attemptId, [90, 90, 90], { xp: 5, coins: 1 });
    expect(again.finalized).toBe(false);
    expect(await xp(user)).toBe(35);
  });

  it("the boss pays its larger reward once", async () => {
    const user = await db.newUser();
    for (const l of LEVELS) await playLevel(db, user, l);
    const before = await xp(user);
    const boss = await playLevel(db, user, BOSS, [90, 90, 90]);
    expect(boss.result).toMatchObject({ first_completion: true, xp_gained: 150, coins_gained: 50 });
    expect(await xp(user)).toBe(before + 150);
    const again = await playLevel(db, user, BOSS, [90, 90, 90]);
    expect(again.result.xp_gained).toBe(0);
    expect(await xp(user)).toBe(before + 150);
  });
});

describe("phases and hints", () => {
  it("phases go in order, each once", async () => {
    const user = await db.newUser();
    const id = await startAttempt(db, user, "sv_1");
    await expect(scorePhase(db, user, id, "code", 70)).rejects.toThrow(/phase_out_of_order/);
    await expect(scorePhase(db, user, id, "defend", 70)).rejects.toThrow(/phase_out_of_order/);
    expect((await scorePhase(db, user, id, "approach", 70)).recorded).toBe(true);
    await scorePhase(db, user, id, "code", 60);
    await expect(scorePhase(db, user, id, "defend", 70)).rejects.toThrow(/phase_out_of_order/); // follow-ups not stored yet
    await storeFollowups(db, user, id);
    expect((await scorePhase(db, user, id, "defend", 55)).recorded).toBe(true);
  });

  it("a second submission of a phase changes nothing and returns the first score", async () => {
    const user = await db.newUser();
    const id = await startAttempt(db, user, "sv_1");
    await scorePhase(db, user, id, "approach", 40);
    const again = await scorePhase(db, user, id, "approach", 100);
    expect(again).toMatchObject({ recorded: false, score: 40 });
    const { rows } = await db.pool.query("select score from public.adventure_phases where attempt_id = $1", [id]);
    expect(rows).toEqual([{ score: 40 }]);
  });

  it("rejects scores outside 0-100", async () => {
    const user = await db.newUser();
    const id = await startAttempt(db, user, "sv_1");
    await expect(scorePhase(db, user, id, "approach", 101)).rejects.toThrow();
    await expect(scorePhase(db, user, id, "approach", -1)).rejects.toThrow();
  });

  it("cannot finalize before all three phases are scored", async () => {
    const user = await db.newUser();
    const id = await startAttempt(db, user, "sv_1");
    await scorePhase(db, user, id, "approach", 80);
    await expect(finalizeAttempt(db, user, id, [80, 80, 80])).rejects.toThrow(/phases_incomplete/);
    expect(await xp(user)).toBe(0);
  });

  it("a finished attempt takes no more phases or hints", async () => {
    const user = await db.newUser();
    const { attemptId } = await playLevel(db, user, "sv_1");
    await expect(scorePhase(db, user, attemptId, "approach", 10)).rejects.toThrow(/attempt_finished/);
    await expect(
      db.rpc("record_adventure_hint", { p_user: user, p_attempt_id: attemptId, p_phase: "code", p_text: "x" }),
    ).rejects.toThrow(/attempt_finished/);
  });

  const hint = (user: string, id: string, phase: string, text = "Look at the loop bounds.") =>
    db.rpc<{ granted: boolean; hint_text: string }>("record_adventure_hint", { p_user: user, p_attempt_id: id, p_phase: phase, p_text: text });

  it("allows one hint per phase; asking again returns the first and grants nothing", async () => {
    const user = await db.newUser();
    const id = await startAttempt(db, user, "sv_1");
    expect(await hint(user, id, "approach", "first hint")).toEqual({ granted: true, hint_text: "first hint" });
    expect(await hint(user, id, "approach", "second hint")).toEqual({ granted: false, hint_text: "first hint" });
    expect((await hint(user, id, "code", "code hint")).granted).toBe(true);
    expect(await count("select count(*) from public.adventure_hints where attempt_id = $1", [id])).toBe(2);
  });

  it("simultaneous hint requests grant exactly one", async () => {
    const user = await db.newUser();
    const id = await startAttempt(db, user, "sv_1");
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => hint(user, id, "approach", `hint ${i}`)));
    expect(results.filter((r) => r.granted)).toHaveLength(1);
    expect(new Set(results.map((r) => r.hint_text)).size).toBe(1);
  });

  it("no hint after the phase is scored", async () => {
    const user = await db.newUser();
    const id = await startAttempt(db, user, "sv_1");
    await scorePhase(db, user, id, "approach", 70);
    await expect(hint(user, id, "approach")).rejects.toThrow(/phase_already_scored/);
  });

  it("follow-ups are stored once and then fixed", async () => {
    const user = await db.newUser();
    const id = await startAttempt(db, user, "sv_1");
    await scorePhase(db, user, id, "approach", 70);
    await expect(storeFollowups(db, user, id)).rejects.toThrow(/phase_out_of_order/); // needs code scored first
    await scorePhase(db, user, id, "code", 70);
    const first = await storeFollowups(db, user, id);
    const second = await db.rpc("store_adventure_followups", { p_user: user, p_attempt_id: id, p_followups: new (await import("../helpers/db")).Json(["something else"]) });
    expect(second).toEqual(first);
  });
});

describe("attempts belong to their owner", () => {
  it("another user cannot read, score, hint or finalize someone else's attempt", async () => {
    const owner = await db.newUser();
    const other = await db.newUser();
    const id = await startAttempt(db, owner, "sv_1");
    await expect(db.rpc("get_adventure_attempt", { p_user: other, p_attempt_id: id })).rejects.toThrow(/attempt_not_found/);
    await expect(scorePhase(db, other, id, "approach", 100)).rejects.toThrow(/attempt_not_found/);
    await expect(
      db.rpc("record_adventure_hint", { p_user: other, p_attempt_id: id, p_phase: "approach", p_text: "x" }),
    ).rejects.toThrow(/attempt_not_found/);
    await expect(finalizeAttempt(db, other, id, [100, 100, 100])).rejects.toThrow(/attempt_not_found/);
    expect(await count("select count(*) from public.adventure_phases where attempt_id = $1", [id])).toBe(0);
  });

  it("get_adventure_attempt returns the question, phases and hints to its owner", async () => {
    const user = await db.newUser();
    const id = await startAttempt(db, user, "sv_1", "Add up the numbers from 1 to n using a loop and return the total.");
    await scorePhase(db, user, id, "approach", 70);
    await db.rpc("record_adventure_hint", { p_user: user, p_attempt_id: id, p_phase: "code", p_text: "Think about where the total starts." });
    const got = await db.rpc<{
      attempt: { question_text: string; status: string };
      level: { id: string; is_boss: boolean };
      phases: { phase: string; score: number }[];
      hints: { phase: string; hint_text: string }[];
    }>("get_adventure_attempt", { p_user: user, p_attempt_id: id });
    expect(got.attempt).toMatchObject({ status: "in_progress", question_text: expect.stringContaining("Add up the numbers") });
    expect(got.level).toMatchObject({ id: "sv_1", is_boss: false });
    expect(got.phases).toEqual([expect.objectContaining({ phase: "approach", score: 70 })]);
    expect(got.hints).toEqual([{ phase: "code", hint_text: "Think about where the total starts." }]);
  });
});

describe("question history for replays", () => {
  it("returns the most recent questions and hashes for a level", async () => {
    const user = await db.newUser();
    const ids = [];
    for (let i = 0; i < 3; i++) ids.push(await startAttempt(db, user, "sv_1", `Question number ${i} is about counting things in a loop.`));
    const history = await db.rpc<{ texts: string[]; hashes: string[] }>("get_level_history", { p_user: user, p_level_id: "sv_1" });
    expect(history.texts).toHaveLength(3);
    expect(history.hashes).toHaveLength(3);
    expect(history.texts[0]).toMatch(/Question number 2/);
    const other = await db.newUser();
    expect((await db.rpc<{ texts: string[] }>("get_level_history", { p_user: other, p_level_id: "sv_1" })).texts).toEqual([]);
  });
});

describe("stats that achievements and quests read", () => {
  const stats = (user: string) =>
    db.rpc<AdventureStatsAll>("get_player_stats", { p_user: user, p_since: "2026-01-01T00:00:00Z" }).then((s) => s.adventure);

  it("starts empty", async () => {
    const user = await db.newUser();
    expect(await stats(user)).toMatchObject({
      levels_completed: 0, boss_defeated: false, world_complete: false, boss_unlocked: false,
      best_overall: 0, comeback: false, unaided_pass: false, recent_passes: [],
    });
  });

  it("Comeback is true only when a failed attempt came before a pass on the same level", async () => {
    const user = await db.newUser();
    await playLevel(db, user, "sv_1", [90, 90, 90]);
    expect((await stats(user)).comeback).toBe(false);

    await playLevel(db, user, "sv_2", [10, 10, 10]); // fail
    expect((await stats(user)).comeback).toBe(false);
    await playLevel(db, user, "sv_2", [80, 80, 80]); // pass later
    expect((await stats(user)).comeback).toBe(true);
  });

  it("a pass followed by a later fail is not a comeback", async () => {
    const user = await db.newUser();
    await playLevel(db, user, "sv_1", [90, 90, 90]);
    await playLevel(db, user, "sv_1", [10, 10, 10]);
    expect((await stats(user)).comeback).toBe(false);
  });

  it("unaided_pass needs a passed attempt with no hint", async () => {
    const user = await db.newUser();
    const id = await startAttempt(db, user, "sv_1");
    await db.rpc("record_adventure_hint", { p_user: user, p_attempt_id: id, p_phase: "approach", p_text: "hint" });
    await scoreAll(db, user, id, [90, 90, 90]);
    await finalizeAttempt(db, user, id, [90, 90, 90]);
    expect((await stats(user)).unaided_pass).toBe(false);
    await playLevel(db, user, "sv_1", [90, 90, 90]); // a replay with no hint
    expect((await stats(user)).unaided_pass).toBe(true);
  });

  it("tracks best overall, boss state and recent passes", async () => {
    const user = await db.newUser();
    for (const l of LEVELS) await playLevel(db, user, l, [95, 95, 95]);
    let s = await stats(user);
    expect(s).toMatchObject({ levels_completed: 5, boss_unlocked: true, boss_defeated: false, best_overall: 95, world_complete: false });
    expect(s.recent_passes).toHaveLength(5);
    expect(s.recent_passes.every((p) => !p.is_boss)).toBe(true);

    await playLevel(db, user, BOSS, [90, 90, 90]);
    s = await stats(user);
    expect(s).toMatchObject({ boss_defeated: true, world_complete: true });
    expect(s.recent_passes.some((p) => p.is_boss)).toBe(true);
  });
});

describe("the hub carries a world summary from real data", () => {
  it("shows the next level and counts", async () => {
    const user = await db.newUser();
    const hub0 = await db.rpc<{ adventure: { world_title: string; completed_count: number; total_count: number; world_complete: boolean; next_level: { id: string } } }>("get_hub", { p_user: user, p_day: "2026-10-24" });
    expect(hub0.adventure).toMatchObject({ world_title: "Syntax Valley", completed_count: 0, total_count: 6, world_complete: false });
    expect(hub0.adventure.next_level.id).toBe("sv_1");
    await playLevel(db, user, "sv_1");
    const hub1 = await db.rpc<typeof hub0>("get_hub", { p_user: user, p_day: "2026-10-24" });
    expect(hub1.adventure).toMatchObject({ completed_count: 1 });
    expect(hub1.adventure.next_level.id).toBe("sv_2");
  });
});

describe("row-level security on adventure tables", () => {
  const TABLES = ["player_level_progress", "adventure_attempts", "adventure_phases", "adventure_hints"] as const;
  const denied = { code: "42501" };
  let alice: string;
  let bob: string;

  beforeAll(async () => {
    alice = await db.newUser();
    bob = await db.newUser();
    for (const u of [alice, bob]) {
      const id = await startAttempt(db, u, "sv_1");
      await db.rpc("record_adventure_hint", { p_user: u, p_attempt_id: id, p_phase: "approach", p_text: "hint" });
      await scorePhase(db, u, id, "approach", 70);
    }
  });

  it("RLS is on for every adventure table", async () => {
    const { rows } = await db.pool.query(
      "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname = any($1)",
      [["worlds", "levels", ...TABLES]],
    );
    expect(rows).toHaveLength(6);
    for (const r of rows) expect(r.relrowsecurity, r.relname).toBe(true);
  });

  for (const table of TABLES) {
    it(`${table}: a player sees only their own rows`, async () => {
      const mine = await db.asUser(alice, (c) => c.query(`select user_id from public.${table}`));
      expect(mine.rowCount).toBeGreaterThan(0);
      expect(mine.rows.every((r) => r.user_id === alice)).toBe(true);
      const peek = await db.asUser(alice, (c) => c.query(`select * from public.${table} where user_id = $1`, [bob]));
      expect(peek.rowCount).toBe(0);
    });

    it(`${table}: no client can insert, change or delete`, async () => {
      await expect(db.asUser(alice, (c) => c.query(`delete from public.${table} where user_id = $1`, [alice]))).rejects.toMatchObject(denied);
      await expect(db.asUser(alice, (c) => c.query(`update public.${table} set user_id = user_id where user_id = $1`, [alice]))).rejects.toMatchObject(denied);
    });
  }

  it("a player cannot write their own progress, unlock a level or edit a score directly", async () => {
    await expect(
      db.asUser(alice, (c) => c.query("insert into public.player_level_progress (user_id, level_id, status) values ($1, 'sv_boss', 'completed')", [alice])),
    ).rejects.toMatchObject(denied);
    await expect(
      db.asUser(alice, (c) => c.query("update public.player_level_progress set status = 'completed' where user_id = $1", [alice])),
    ).rejects.toMatchObject(denied);
    await expect(
      db.asUser(alice, (c) => c.query("update public.adventure_phases set score = 100 where user_id = $1", [alice])),
    ).rejects.toMatchObject(denied);
    await expect(
      db.asUser(alice, (c) => c.query("insert into public.adventure_phases (attempt_id, user_id, phase, score, feedback) values (gen_random_uuid(), $1, 'code', 100, 'x')", [alice])),
    ).rejects.toMatchObject(denied);
    expect(await statuses(alice)).toMatchObject({ sv_boss: "locked", sv_2: "locked" });
  });

  it("worlds and levels are readable by everyone but writable by no one", async () => {
    expect((await db.asAnon((c) => c.query("select id from public.levels"))).rowCount).toBe(6);
    expect((await db.asUser(alice, (c) => c.query("select id from public.worlds"))).rowCount).toBe(1);
    await expect(db.asUser(alice, (c) => c.query("update public.levels set reward_xp = 200"))).rejects.toMatchObject(denied);
    await expect(db.asAnon((c) => c.query("delete from public.worlds"))).rejects.toMatchObject(denied);
  });

  it("the progress tables are not readable signed out", async () => {
    for (const t of TABLES) await expect(db.asAnon((c) => c.query(`select * from public.${t}`)), t).rejects.toMatchObject(denied);
  });

  it("no adventure function is executable by the browser roles; the server role can run them all", async () => {
    const { rows } = await db.pool.query(`
      select p.proname,
             has_function_privilege('anon', p.oid, 'execute') as anon_exec,
             has_function_privilege('authenticated', p.oid, 'execute') as auth_exec,
             has_function_privilege('service_role', p.oid, 'execute') as service_exec
        from pg_proc p
       where p.pronamespace = 'public'::regnamespace
         and (p.proname like '%adventure%' or p.proname in ('level_status', 'get_level_history'))`);
    expect(rows.length).toBeGreaterThanOrEqual(10);
    for (const r of rows) {
      expect(r.anon_exec, `${r.proname} anon`).toBe(false);
      expect(r.auth_exec, `${r.proname} authenticated`).toBe(false);
      expect(r.service_exec, `${r.proname} service_role`).toBe(true);
    }
  });

  it("calling the start or finalize functions directly as a player is refused", async () => {
    await expect(
      db.asUser(alice, (c) => c.query("select public.start_adventure_attempt($1, 'sv_1', 'A question that is long enough', 'h')", [alice])),
    ).rejects.toMatchObject(denied);
    await expect(
      db.asUser(alice, (c) => c.query("select public.finalize_adventure_attempt($1, $2, 100, true, 0, 0)", [alice, randomUUID()])),
    ).rejects.toMatchObject(denied);
    await expect(db.asAnon((c) => c.query("select public.get_adventure($1, 'syntax_valley')", [alice]))).rejects.toMatchObject(denied);
  });
});
