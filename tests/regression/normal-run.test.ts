import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { setRpcTransport } from "@/lib/db";
import { computeQuestionReward } from "@/lib/progression/rewards";
import {
  claimQuest,
  hashPosting,
  issueRunIfConfigured,
  loadHub,
  recordQuestionCompletion,
  setTimezone,
} from "@/lib/progression/server";
import { guardNewSession } from "@/lib/usage";
import { createTestDb, type TestDb } from "../helpers/db";
import { request } from "../helpers/adventure";

/**
 * The normal (Milestone 1) run, end to end through the server logic: generate and
 * record a run, score a question, get paid once, see it on the Hub, claim a quest.
 * Adventure was added alongside it; this proves it still behaves the same.
 */
let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  setRpcTransport(db.transport);
});
afterAll(async () => {
  setRpcTransport(null);
  await db.close();
});
afterEach(() => vi.unstubAllEnvs());

const role = { role_title: "Backend Engineer", seniority: "Mid-level", tech_stack: ["Node.js", "Postgres"], focus_areas: ["APIs"] };
const questions = [
  { id: randomUUID(), difficulty: "easy" as const, topic: "arrays", order_index: 0 },
  { id: randomUUID(), difficulty: "hard" as const, topic: "concurrency", order_index: 1 },
];

describe("a normal run still works", () => {
  it("records an issued run, pays a scored question once, and shows it on the Hub", async () => {
    const user = await db.newUser();
    const sessionId = randomUUID();
    expect(await issueRunIfConfigured({ userId: user, sessionId, role, postingHash: hashPosting(role), questions })).toBe(true);

    const scores = { correctness: 80, communication: 70, reasoning: 60 };
    const expected = computeQuestionReward({ difficulty: "easy", scores, isRepeatPosting: false });
    const first = await recordQuestionCompletion({ userId: user, sessionId, questionId: questions[0].id, claimedLanguage: "python", detectedLanguage: "python", scores });
    expect(first).toMatchObject({ recorded: true, granted: true, xp_gained: expected.xp, coins_gained: expected.coins });

    const retry = await recordQuestionCompletion({ userId: user, sessionId, questionId: questions[0].id, claimedLanguage: "python", detectedLanguage: "python", scores: { correctness: 100, communication: 100, reasoning: 100 } });
    expect(retry).toMatchObject({ recorded: false, granted: false, xp_gained: 0 });
    expect(retry?.scores).toEqual(scores);

    const hub = await loadHub(user);
    expect(hub.player.total_xp).toBe(expected.xp);
    expect(hub.recent_runs[0]).toMatchObject({ role_title: "Backend Engineer", questions_done: 1, questions_total: 2 });
    expect(hub.achievements.find((a) => a.id === "first_run")?.unlocked_at).not.toBeNull();
    expect(hub.quests).toHaveLength(3);
    // the new Adventure summary is there and starts at level 1
    expect(hub.adventure).toMatchObject({ world_title: "Syntax Valley", completed_count: 0, total_count: 6, world_complete: false });
    expect(hub.adventure.next_level?.id).toBe("sv_1");
  });

  it("a question that was never issued earns nothing", async () => {
    const user = await db.newUser();
    const none = await recordQuestionCompletion({
      userId: user, sessionId: randomUUID(), questionId: randomUUID(), claimedLanguage: "java",
      scores: { correctness: 100, communication: 100, reasoning: 100 },
    });
    expect(none).toBeNull();
  });

  it("repeating the same posting pays the reduced amount, as before", async () => {
    const user = await db.newUser();
    const run = async () => {
      const sessionId = randomUUID();
      const qs = [{ id: randomUUID(), difficulty: "medium" as const, topic: "x", order_index: 0 }];
      await issueRunIfConfigured({ userId: user, sessionId, role, postingHash: hashPosting(role), questions: qs });
      await new Promise((r) => setTimeout(r, 15));
      return recordQuestionCompletion({ userId: user, sessionId, questionId: qs[0].id, claimedLanguage: "javascript", detectedLanguage: "javascript", scores: { correctness: 90, communication: 90, reasoning: 90 } });
    };
    const first = await run();
    const second = await run();
    expect(second!.xp_gained).toBeLessThan(first!.xp_gained);
    expect(second!.xp_gained).toBe(computeQuestionReward({ difficulty: "medium", scores: { correctness: 90, communication: 90, reasoning: 90 }, isRepeatPosting: true }).xp);
  });

  it("a finished quest can be claimed once", async () => {
    // Which three quests a user gets depends on their id, and the adventure ones
    // can't be finished by normal questions, so look at a few users for one that can.
    const three = [
      ...questions,
      { id: randomUUID(), difficulty: "medium" as const, topic: "strings", order_index: 2 },
    ];
    let found: { user: string; hub: Awaited<ReturnType<typeof loadHub>>; questId: string; xp: number } | null = null;
    for (let i = 0; i < 12 && !found; i++) {
      const user = await db.newUser();
      await setTimezone(user, "UTC");
      const sessionId = randomUUID();
      await issueRunIfConfigured({ userId: user, sessionId, role, postingHash: hashPosting(role), questions: three });
      for (const q of three) {
        await recordQuestionCompletion({ userId: user, sessionId, questionId: q.id, claimedLanguage: "java", detectedLanguage: "java", scores: { correctness: 90, communication: 90, reasoning: 90 } });
      }
      const hub = await loadHub(user);
      const done = hub.quests.find((q) => q.completed && !q.claimed);
      if (done) found = { user, hub, questId: done.id, xp: done.xp };
    }
    expect(found, "one of 12 users should have a finishable quest today").not.toBeNull();
    const { user, hub, questId, xp } = found!;
    expect((await claimQuest(user, questId)).status).toBe("claimed");
    expect((await claimQuest(user, questId)).status).toBe("already_claimed");
    expect((await loadHub(user)).player.total_xp).toBe(hub.player.total_xp + xp);
  });

  it("the daily limit for normal runs still counts and still blocks", async () => {
    vi.stubEnv("ENFORCE_LIMITS", "true");
    vi.stubEnv("DAILY_SESSION_LIMIT", "2");
    vi.stubEnv("GLOBAL_DAILY_AI_CAP", "100000");
    const user = await db.newUser();
    const req = request("/api/generate-questions", {});
    expect((await guardNewSession(req, user)).response).toBeNull();
    expect((await guardNewSession(req, user)).response).toBeNull();
    const blocked = (await guardNewSession(req, user)).response;
    expect(blocked?.status).toBe(429);
    expect((await blocked!.json()).reason).toBe("daily_limit");
  });
});
