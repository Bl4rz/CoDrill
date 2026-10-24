import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ACHIEVEMENTS, LEVEL } from "@/lib/progression/config";
import { levelForXp, xpForLevel } from "@/lib/progression/level";
import { createTestDb, type TestDb } from "../helpers/db";

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});

describe("SQL and TypeScript agree", () => {
  it("level_for_xp matches levelForXp for every XP from 0 to 60,000", async () => {
    const { rows } = await db.pool.query<{ x: number; lvl: number }>(
      "select x, public.level_for_xp(x) as lvl from generate_series(0, 60000) x",
    );
    expect(rows).toHaveLength(60001);
    const mismatches = rows.filter((r) => r.lvl !== levelForXp(r.x));
    expect(mismatches).toEqual([]);
  });

  it("level_for_xp matches at every level boundary and at the cap", async () => {
    for (let level = 1; level <= LEVEL.maxLevel; level++) {
      const start = xpForLevel(level);
      for (const xp of [start, Math.max(0, start - 1), start + 1]) {
        const { rows } = await db.pool.query("select public.level_for_xp($1) as lvl", [xp]);
        expect(rows[0].lvl, `xp ${xp}`).toBe(levelForXp(xp));
      }
    }
    const { rows } = await db.pool.query("select public.level_for_xp(100000000) as lvl");
    expect(rows[0].lvl).toBe(LEVEL.maxLevel);
  });

  it("the seeded achievements are exactly the ones in the config", async () => {
    const { rows } = await db.pool.query("select id, name, description from public.achievements order by sort_order");
    expect(rows).toEqual(ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name, description: a.description })));
  });
});
