import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, Json, type TestDb } from "../helpers/db";
import type { HubRaw, StatsRaw } from "../helpers/fixtures";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});

const DAY = "2026-10-24";
const defs = (...ids: string[]) => new Json(ids.map((id) => ({ id, target: id === "finish_3" ? 3 : 1 })));
const ensure = (user: string, ids: string[], day = DAY) =>
  db.rpc("ensure_daily_quests", { p_user: user, p_day: day, p_defs: defs(...ids) });
const progress = (user: string, p: Record<string, number>, day = DAY) =>
  db.rpc("update_quest_progress", { p_user: user, p_day: day, p_progress: new Json(p) });
const claim = (user: string, questId: string, xp = 20, coins = 5, day = DAY) =>
  db.rpc<{ status: string; reward?: { granted: boolean; total_xp: number; coins: number; level: number } }>("claim_quest", {
    p_user: user,
    p_quest_id: questId,
    p_day: day,
    p_xp: xp,
    p_coins: coins,
  });
const questRows = async (user: string, day = DAY) =>
  (await db.pool.query("select quest_id, target, progress, completed_at, claimed_at from public.player_quests where user_id=$1 and day=$2 order by quest_id", [user, day])).rows;
const xp = async (user: string) =>
  (await db.pool.query("select total_xp, coins from public.player_progression where user_id=$1", [user])).rows[0];

describe("daily quests", () => {
  it("fixes the day's three quests, and asking again does not add more", async () => {
    const user = await db.newUser();
    await ensure(user, ["finish_1", "finish_3", "hard_1"]);
    await ensure(user, ["finish_1", "finish_3", "hard_1"]);
    await ensure(user, ["communication_70", "reasoning_70", "correctness_70"]);
    const rows = await questRows(user);
    expect(rows.map((r) => r.quest_id)).toEqual(["finish_1", "finish_3", "hard_1"]);
    expect(rows.find((r) => r.quest_id === "finish_3")!.target).toBe(3);
  });

  it("simultaneous first loads with different picks still end with exactly one set", async () => {
    const user = await db.newUser();
    await Promise.all([
      ensure(user, ["finish_1", "finish_3", "hard_1"]),
      ensure(user, ["communication_70", "reasoning_70", "correctness_70"]),
      ensure(user, ["finish_1", "hard_1", "new_language"]),
      ensure(user, ["finish_3", "new_language", "reasoning_70"]),
    ]);
    expect(await questRows(user)).toHaveLength(3);
  });

  it("a new day gets its own quests and leaves the old ones alone", async () => {
    const user = await db.newUser();
    await ensure(user, ["finish_1", "finish_3", "hard_1"], "2026-10-24");
    await ensure(user, ["communication_70", "reasoning_70", "correctness_70"], "2026-10-25");
    expect((await questRows(user, "2026-10-24")).map((r) => r.quest_id)).toContain("finish_1");
    expect((await questRows(user, "2026-10-25")).map((r) => r.quest_id)).toContain("reasoning_70");
  });

  it("progress only goes up and never past the target", async () => {
    const user = await db.newUser();
    await ensure(user, ["finish_1", "finish_3", "hard_1"]);
    await progress(user, { finish_3: 2 });
    await progress(user, { finish_3: 1 }); // lower value is ignored
    expect((await questRows(user)).find((r) => r.quest_id === "finish_3")!.progress).toBe(2);
    await progress(user, { finish_3: 99 });
    const r = (await questRows(user)).find((q) => q.quest_id === "finish_3")!;
    expect(r.progress).toBe(3);
    expect(r.completed_at).not.toBeNull();
  });

  it("an incomplete quest cannot be claimed", async () => {
    const user = await db.newUser();
    await ensure(user, ["finish_1", "finish_3", "hard_1"]);
    await progress(user, { finish_3: 2 });
    expect((await claim(user, "finish_3")).status).toBe("not_complete");
    expect(await xp(user)).toEqual({ total_xp: 0, coins: 0 });
  });

  it("a quest that is not in today's set cannot be claimed", async () => {
    const user = await db.newUser();
    await ensure(user, ["finish_1", "finish_3", "hard_1"]);
    expect((await claim(user, "reasoning_70")).status).toBe("not_found");
    expect((await claim(user, "finish_1", 20, 5, "2026-10-23")).status).toBe("not_found");
  });

  it("claiming pays once; a second claim fails safely and pays nothing", async () => {
    const user = await db.newUser();
    await ensure(user, ["finish_1", "finish_3", "hard_1"]);
    await progress(user, { finish_1: 1 });
    const first = await claim(user, "finish_1", 15, 5);
    expect(first.status).toBe("claimed");
    expect(first.reward).toMatchObject({ granted: true, total_xp: 15, coins: 5 });

    const second = await claim(user, "finish_1", 15, 5);
    expect(second.status).toBe("already_claimed");
    expect(second.reward).toBeUndefined();
    expect(await xp(user)).toEqual({ total_xp: 15, coins: 5 });
    expect((await questRows(user)).find((r) => r.quest_id === "finish_1")!.claimed_at).not.toBeNull();
  });

  it("ten simultaneous claims pay exactly once", async () => {
    const user = await db.newUser();
    await ensure(user, ["finish_1", "finish_3", "hard_1"]);
    await progress(user, { hard_1: 1 });
    const results = await Promise.all(Array.from({ length: 10 }, () => claim(user, "hard_1", 25, 8)));
    expect(results.filter((r) => r.status === "claimed")).toHaveLength(1);
    expect(results.filter((r) => r.status === "already_claimed")).toHaveLength(9);
    expect(await xp(user)).toEqual({ total_xp: 25, coins: 8 });
  });

  it("the same quest on another day is a separate claim", async () => {
    const user = await db.newUser();
    for (const day of ["2026-10-24", "2026-10-25"]) {
      await ensure(user, ["finish_1", "finish_3", "hard_1"], day);
      await progress(user, { finish_1: 1 }, day);
      expect((await claim(user, "finish_1", 15, 5, day)).status).toBe("claimed");
    }
    expect(await xp(user)).toEqual({ total_xp: 30, coins: 10 });
  });

  it("refuses an absurd reward amount", async () => {
    const user = await db.newUser();
    await ensure(user, ["finish_1", "finish_3", "hard_1"]);
    await progress(user, { finish_1: 1 });
    await expect(claim(user, "finish_1", 5000, 5)).rejects.toThrow(/invalid xp amount/);
    expect((await questRows(user)).find((r) => r.quest_id === "finish_1")!.claimed_at).toBeNull();
  });
});

describe("achievements", () => {
  const unlock = (user: string, ids: string[]) => db.rpc<string[]>("unlock_achievements", { p_user: user, p_ids: ids });

  it("reports an unlock once and never again", async () => {
    const user = await db.newUser();
    expect(await unlock(user, ["first_run"])).toEqual(["first_run"]);
    expect(await unlock(user, ["first_run"])).toEqual([]);
    expect(await unlock(user, ["first_run", "three_down"])).toEqual(["three_down"]);
    const { rows } = await db.pool.query("select count(*) from public.player_achievements where user_id=$1", [user]);
    expect(Number(rows[0].count)).toBe(2);
  });

  it("ignores ids that are not real achievements", async () => {
    const user = await db.newUser();
    expect(await unlock(user, ["made_up", "first_run"])).toEqual(["first_run"]);
  });

  it("10 simultaneous unlocks report it as new exactly once", async () => {
    const user = await db.newUser();
    const results = await Promise.all(Array.from({ length: 10 }, () => unlock(user, ["polyglot"])));
    expect(results.filter((r) => r.length === 1)).toHaveLength(1);
  });

  it("shows up in the hub with its unlock time", async () => {
    const user = await db.newUser();
    await unlock(user, ["level_5"]);
    const hub = await db.rpc<HubRaw>("get_hub", { p_user: user, p_day: DAY });
    expect(hub.achievements.map((a) => a.id)).toEqual(["level_5"]);
  });
});

describe("time zone setting", () => {
  const setTz = (user: string, tz: string) =>
    db.rpc<{ timezone: string | null; changed: boolean; reason?: string }>("set_timezone", { p_user: user, p_tz: tz, p_cooldown_hours: 24 });

  it("accepts a real zone, rejects a fake one", async () => {
    const user = await db.newUser();
    expect(await setTz(user, "America/Los_Angeles")).toEqual({ timezone: "America/Los_Angeles", changed: true });
    expect((await setTz(user, "Mars/Base")).reason).toBe("invalid");
    expect((await setTz(user, "America/Los_Angeles")).reason).toBe("same");
  });

  it("blocks a second change inside the cooldown, allows it after", async () => {
    const user = await db.newUser();
    await setTz(user, "America/New_York");
    const blocked = await setTz(user, "Asia/Tokyo");
    expect(blocked).toMatchObject({ changed: false, reason: "cooldown", timezone: "America/New_York" });
    await db.pool.query("update public.player_progression set timezone_changed_at = now() - interval '25 hours' where user_id=$1", [user]);
    expect(await setTz(user, "Asia/Tokyo")).toEqual({ timezone: "Asia/Tokyo", changed: true });
  });
});

describe("hub fixes the day's quests in one call", () => {
  it("get_hub with picked quests creates them once and returns them", async () => {
    const user = await db.newUser();
    const picks = new Json([{ id: "finish_1", target: 1 }, { id: "hard_1", target: 1 }, { id: "reasoning_70", target: 1 }]);
    const first = await db.rpc<HubRaw>("get_hub", { p_user: user, p_day: DAY, p_defs: picks });
    expect(first.quests.map((q) => q.quest_id)).toEqual(["finish_1", "hard_1", "reasoning_70"]);
    const other = new Json([{ id: "finish_3", target: 3 }, { id: "correctness_70", target: 1 }, { id: "new_language", target: 1 }]);
    const second = await db.rpc<HubRaw>("get_hub", { p_user: user, p_day: DAY, p_defs: other });
    expect(second.quests.map((q) => q.quest_id)).toEqual(["finish_1", "hard_1", "reasoning_70"]);
  });

  it("get_player_stats reports the stored time zone (UTC before one is set)", async () => {
    const user = await db.newUser();
    const since = "2026-01-01T00:00:00Z";
    expect((await db.rpc<StatsRaw>("get_player_stats", { p_user: user, p_since: since })).timezone).toBe("UTC");
    await db.rpc("set_timezone", { p_user: user, p_tz: "Asia/Tokyo", p_cooldown_hours: 24 });
    expect((await db.rpc<StatsRaw>("get_player_stats", { p_user: user, p_since: since })).timezone).toBe("Asia/Tokyo");
  });
});
