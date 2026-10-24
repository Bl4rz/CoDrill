import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, Json, type TestDb } from "../helpers/db";
import { completeQuestion, issueRun } from "../helpers/fixtures";

let db: TestDb;
let alice: string;
let bob: string;

const TABLES = [
  "player_progression",
  "xp_transactions",
  "coin_transactions",
  "issued_runs",
  "issued_questions",
  "question_results",
  "player_quests",
  "player_achievements",
] as const;

const DAY = "2026-10-24";

beforeAll(async () => {
  db = await createTestDb();
  alice = await db.newUser();
  bob = await db.newUser();
  for (const user of [alice, bob]) {
    const run = await issueRun(db, user);
    await completeQuestion(db, user, run, 0);
    await db.rpc("ensure_daily_quests", { p_user: user, p_day: DAY, p_defs: new Json([{ id: "finish_1", target: 1 }]) });
    await db.rpc("unlock_achievements", { p_user: user, p_ids: ["first_run"] });
  }
});
afterAll(async () => {
  await db.close();
});

const denied = { code: "42501" };

describe("row-level security: reading", () => {
  it("every progression table has RLS switched on", async () => {
    const { rows } = await db.pool.query(
      "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname = any($1)",
      [[...TABLES, "achievements"]],
    );
    expect(rows).toHaveLength(TABLES.length + 1);
    for (const r of rows) expect(r.relrowsecurity, r.relname).toBe(true);
  });

  for (const table of TABLES) {
    it(`${table}: a user sees only their own rows`, async () => {
      const asAlice = await db.asUser(alice, (c) => c.query(`select user_id from public.${table}`));
      expect(asAlice.rowCount).toBeGreaterThan(0);
      expect(asAlice.rows.every((r) => r.user_id === alice)).toBe(true);

      // asking for Bob's rows by name returns nothing
      const peek = await db.asUser(alice, (c) => c.query(`select * from public.${table} where user_id = $1`, [bob]));
      expect(peek.rowCount).toBe(0);
    });
  }

  it("a signed-in session with no user id sees nothing", async () => {
    const rows = await db.asUser("", (c) => c.query("select * from public.player_progression"));
    expect(rows.rowCount).toBe(0);
  });

  it("anyone can read the achievement list, but signed-out visitors can read nothing else", async () => {
    const list = await db.asAnon((c) => c.query("select id from public.achievements"));
    expect(list.rowCount).toBe(6);
    for (const table of TABLES) {
      await expect(db.asAnon((c) => c.query(`select * from public.${table}`)), table).rejects.toMatchObject(denied);
    }
  });
});

describe("row-level security: writing is impossible from the client", () => {
  it("a user cannot raise their own XP, level or coins", async () => {
    const before = (await db.pool.query("select total_xp, level, coins from public.player_progression where user_id=$1", [alice])).rows[0];
    await expect(
      db.asUser(alice, (c) => c.query("update public.player_progression set total_xp = 999999, level = 50, coins = 999999 where user_id = $1", [alice])),
    ).rejects.toMatchObject(denied);
    const after = (await db.pool.query("select total_xp, level, coins from public.player_progression where user_id=$1", [alice])).rows[0];
    expect(after).toEqual(before);
  });

  it("a user cannot insert XP, coins, results, quests or achievements for themselves or anyone else", async () => {
    const attempts: [string, string, unknown[]][] = [
      ["player_progression", "insert into public.player_progression (user_id, total_xp) values ($1, 1000000)", [await db.newUser()]],
      ["xp_transactions", "insert into public.xp_transactions (user_id, amount, reason, source_type, source_id) values ($1, 500, 'question_completed', 'cheat', 'x')", [alice]],
      ["coin_transactions", "insert into public.coin_transactions (user_id, amount, reason, source_type, source_id) values ($1, 500, 'question_completed', 'cheat', 'x')", [alice]],
      ["question_results", "insert into public.question_results (user_id, session_id, question_id, difficulty, topic, language, correctness, communication, reasoning) values ($1, gen_random_uuid(), gen_random_uuid(), 'hard', 't', 'java', 100, 100, 100)", [alice]],
      ["player_quests", "insert into public.player_quests (user_id, quest_id, day, target, progress, completed_at) values ($1, 'cheat', '2026-10-24', 1, 1, now())", [alice]],
      ["player_achievements", "insert into public.player_achievements (user_id, achievement_id) values ($1, 'level_5')", [alice]],
      ["issued_runs", "insert into public.issued_runs (session_id, user_id, role_title, seniority, posting_hash) values (gen_random_uuid(), $1, 'x', 'x', 'x')", [alice]],
    ];
    for (const [table, sql, params] of attempts) {
      await expect(db.asUser(alice, (c) => c.query(sql, params)), table).rejects.toMatchObject(denied);
    }
  });

  it("a user cannot edit or delete rows, their own or anyone else's", async () => {
    for (const table of TABLES) {
      await expect(db.asUser(alice, (c) => c.query(`delete from public.${table} where user_id = $1`, [alice])), `delete ${table}`).rejects.toMatchObject(denied);
      await expect(db.asUser(alice, (c) => c.query(`delete from public.${table} where user_id = $1`, [bob])), `delete other ${table}`).rejects.toMatchObject(denied);
    }
    await expect(db.asUser(alice, (c) => c.query("update public.question_results set correctness = 100 where user_id = $1", [alice]))).rejects.toMatchObject(denied);
    await expect(db.asUser(alice, (c) => c.query("update public.player_quests set claimed_at = null, progress = 99 where user_id = $1", [alice]))).rejects.toMatchObject(denied);
    await expect(db.asUser(alice, (c) => c.query("update public.player_progression set coins = 5 where user_id = $1", [bob]))).rejects.toMatchObject(denied);
  });

  it("nobody can write the achievement list", async () => {
    await expect(db.asUser(alice, (c) => c.query("insert into public.achievements (id, name, description) values ('x','x','x')"))).rejects.toMatchObject(denied);
    await expect(db.asAnon((c) => c.query("update public.achievements set name = 'hacked'"))).rejects.toMatchObject(denied);
  });

  it("table privileges match: select only, and only for signed-in users", async () => {
    for (const table of TABLES) {
      const { rows } = await db.pool.query(
        `select has_table_privilege('authenticated', 'public.${table}', 'select') as sel,
                has_table_privilege('authenticated', 'public.${table}', 'insert') as ins,
                has_table_privilege('authenticated', 'public.${table}', 'update') as upd,
                has_table_privilege('authenticated', 'public.${table}', 'delete') as del,
                has_table_privilege('anon', 'public.${table}', 'select') as anon_sel`,
      );
      expect(rows[0], table).toEqual({ sel: true, ins: false, upd: false, del: false, anon_sel: false });
    }
  });
});

describe("only the server can call the progression functions", () => {
  it("no function is executable by the browser roles, and every one is executable by service_role", async () => {
    const { rows } = await db.pool.query(`
      select p.proname,
             has_function_privilege('anon', p.oid, 'execute') as anon_exec,
             has_function_privilege('authenticated', p.oid, 'execute') as auth_exec,
             has_function_privilege('service_role', p.oid, 'execute') as service_exec
        from pg_proc p
       where p.pronamespace = 'public'::regnamespace
         and p.proname not in ('reject_ledger_update')`);
    expect(rows.length).toBeGreaterThanOrEqual(14);
    for (const r of rows) {
      expect(r.anon_exec, `${r.proname} anon`).toBe(false);
      expect(r.auth_exec, `${r.proname} authenticated`).toBe(false);
      expect(r.service_exec, `${r.proname} service_role`).toBe(true);
    }
  });

  it("a signed-in user calling grant_rewards or complete_question directly is refused", async () => {
    await expect(
      db.asUser(alice, (c) => c.query("select public.grant_rewards($1, 200, 100, 'question_completed', 'cheat', 'x')", [alice])),
    ).rejects.toMatchObject(denied);
    await expect(
      db.asUser(alice, (c) => c.query("select public.claim_quest($1, 'finish_1', '2026-10-24', 200, 100)", [alice])),
    ).rejects.toMatchObject(denied);
    await expect(
      db.asUser(alice, (c) => c.query("select public.unlock_achievements($1, array['level_5'])", [alice])),
    ).rejects.toMatchObject(denied);
    await expect(db.asAnon((c) => c.query("select public.get_hub($1, '2026-10-24')", [alice]))).rejects.toMatchObject(denied);
  });

  it("none of those attempts changed anyone's totals", async () => {
    const { rows } = await db.pool.query("select user_id, total_xp, coins from public.player_progression order by user_id");
    for (const r of rows) {
      expect(r.total_xp).toBe(30);
      expect(r.coins).toBe(5);
    }
  });
});
