import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai", () => ({ callStructured: vi.fn() }));

import { callStructured } from "@/lib/ai";
import { AiOutputError, realAdventureAi } from "@/lib/adventure/ai";
import { handlePhase, handleStart } from "@/lib/adventure/handlers";
import { createTestDb, type TestDb } from "../helpers/db";
import { makeDeps, read, request } from "../helpers/adventure";

const mocked = vi.mocked(callStructured);
const input = { phase: "code" as const, question: "Add up a list.", code: "function f(){}", language: "javascript" };

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});
beforeEach(() => mocked.mockReset());

describe("the AI's output is validated before anything uses it", () => {
  it("accepts a good score and rounds it to a whole number", async () => {
    mocked.mockResolvedValueOnce({ score: 72.6, feedback: "Nice work on the loop." });
    expect(await realAdventureAi.scorePhase(input)).toEqual({ score: 73, feedback: "Nice work on the loop." });
  });

  it.each([
    ["a score above 100", { score: 150, feedback: "Great job overall." }],
    ["a negative score", { score: -5, feedback: "Great job overall." }],
    ["a score that isn't a number", { score: "lots", feedback: "Great job overall." }],
    ["a missing score", { feedback: "Great job overall." }],
    ["missing feedback", { score: 80 }],
    ["empty feedback", { score: 80, feedback: "" }],
    ["not an object", "ninety"],
    ["null", null],
  ])("rejects %s", async (_name, garbage) => {
    mocked.mockResolvedValueOnce(garbage);
    await expect(realAdventureAi.scorePhase(input)).rejects.toBeInstanceOf(AiOutputError);
  });

  it("drops anything extra the model adds, so it can never carry XP, HP or an unlock", async () => {
    mocked.mockResolvedValueOnce({ score: 80, feedback: "Solid answer here.", xp: 9999, hp: 0, unlock: "boss_slayer" });
    const out = await realAdventureAi.scorePhase(input);
    expect(Object.keys(out).sort()).toEqual(["feedback", "score"]);
  });

  it("validates questions, hints and follow-ups too", async () => {
    mocked.mockResolvedValueOnce({ question_text: "too short" });
    await expect(realAdventureAi.generateQuestion({ level: { title: "t", topic: "arrays", difficulty: "easy", is_boss: false }, previous: [] })).rejects.toBeInstanceOf(AiOutputError);
    mocked.mockResolvedValueOnce({ hint: "" });
    await expect(realAdventureAi.generateHint(input)).rejects.toBeInstanceOf(AiOutputError);
    mocked.mockResolvedValueOnce({ questions: [] });
    await expect(realAdventureAi.generateFollowups({ question: "q", approach: "a", code: "c", language: "javascript" })).rejects.toBeInstanceOf(AiOutputError);
    mocked.mockResolvedValueOnce({ questions: ["Why did you pick a loop here?", "What breaks on empty input?", "A third one"] });
    await expect(realAdventureAi.generateFollowups({ question: "q", approach: "a", code: "c", language: "javascript" })).rejects.toBeInstanceOf(AiOutputError);
  });

  it("the grading prompt is fair: no penalty for wording, accent or speed, and the player's work is marked untrusted", async () => {
    mocked.mockResolvedValueOnce({ score: 60, feedback: "A solid, passing effort." });
    await realAdventureAi.scorePhase(input);
    const call = mocked.mock.calls[0][0];
    expect(call.system).toMatch(/accent/i);
    expect(call.system).toMatch(/grammar/i);
    expect(call.system).toMatch(/how long it took/i);
    expect(call.system).toMatch(/UNTRUSTED/);
    expect(String(call.messages[0].content)).toContain("<player_work>");
  });

  it("level questions are asked for on the level's topic and difficulty, with earlier questions listed to avoid", async () => {
    mocked.mockResolvedValueOnce({ question_text: "Write a function that counts the vowels in a string." });
    await realAdventureAi.generateQuestion({
      level: { title: "String Creek", topic: "strings", difficulty: "beginner", is_boss: false },
      previous: ["Reverse a string without using a built-in reverse."],
    });
    const call = mocked.mock.calls[0][0];
    expect(String(call.messages[0].content)).toContain("Topic: strings");
    expect(String(call.messages[0].content)).toContain("Difficulty: beginner");
    expect(String(call.messages[0].content)).toContain("Reverse a string");
    expect(call.system).toMatch(/different/i);
  });

  it("a debugging exercise that labels its own bugs is rejected, a clean one is accepted", async () => {
    const boss = { title: "The Debug Goblin", topic: "debugging", difficulty: "medium", is_boss: true };
    const labelled = [
      "Fix this.\n```js\nlet n = 0;\n// bug 1: loop bound is wrong\nfor (let i = 0; i <= 3; i++) n += i;\n```\nIt prints the wrong total for the list.",
      "Fix this.\n```python\ntotal = 0  # fix: should start at 1\nfor x in xs: total += x\n```\nThe total is off by one for the example.",
      "Bug 2 is hiding in the string handling of this snippet, find it and fix every problem you can see in it.",
    ];
    for (const text of labelled) {
      mocked.mockResolvedValueOnce({ question_text: text });
      await expect(realAdventureAi.generateQuestion({ level: boss, previous: [] })).rejects.toBeInstanceOf(AiOutputError);
    }
    const clean = "Here is a snippet. It should add up the list but prints the wrong total.\n```js\nlet n = 0;\nfor (let i = 0; i <= xs.length; i++) n += xs[i];\nconsole.log(n);\n```\nFind what is wrong and fix it.";
    mocked.mockResolvedValueOnce({ question_text: clean });
    await expect(realAdventureAi.generateQuestion({ level: boss, previous: [] })).resolves.toBe(clean);
    // levels that aren't about debugging aren't checked this way
    mocked.mockResolvedValueOnce({ question_text: "Write a function that adds up a list of numbers.\n```js\n// your code here\n```\nReturn the total." });
    await expect(
      realAdventureAi.generateQuestion({ level: { title: "Variable Meadow", topic: "variables and loops", difficulty: "beginner", is_boss: false }, previous: [] }),
    ).resolves.toContain("your code here");
  });

  it("the boss exercise is asked for with three bugs", async () => {
    mocked.mockResolvedValueOnce({ question_text: "Here is a snippet with problems. Describe what goes wrong and fix it." });
    await realAdventureAi.generateQuestion({
      level: { title: "The Debug Goblin", topic: "debugging", difficulty: "medium", is_boss: true },
      previous: [],
    });
    expect(mocked.mock.calls[0][0].system).toMatch(/THREE/);
  });
});

describe("garbage from the real AI path never becomes a result or a charge", () => {
  it("a garbage score returns a retryable error and stores nothing", async () => {
    const user = await db.newUser();
    mocked.mockResolvedValueOnce({ question_text: "Write a function that adds up a list of numbers using a loop." });
    const deps = makeDeps(db, user, realAdventureAi);
    const started = await handleStart(request("/api/adventure/start", { level_id: "sv_1" }), deps).then(read);
    expect(started.status).toBe(200);
    const id = started.body.attempt_id;

    mocked.mockResolvedValueOnce({ score: 9000, feedback: "Excellent!!!" });
    const res = await handlePhase(request("/api/adventure/phase", { attempt_id: id, phase: "approach", approach_text: "I would loop and add." }), deps).then(read);
    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({ reason: "ai_failed", retryable: true });
    expect((await db.pool.query("select count(*) from public.adventure_phases where attempt_id = $1", [id])).rows[0].count).toBe("0");
    expect((await db.pool.query("select failed_attempts from public.player_level_progress where user_id = $1", [user])).rows[0].failed_attempts).toBe(0);

    mocked.mockResolvedValueOnce({ score: 75, feedback: "Clear plan, good edge cases." });
    const retry = await handlePhase(request("/api/adventure/phase", { attempt_id: id, phase: "approach", approach_text: "I would loop and add." }), deps).then(read);
    expect(retry.status).toBe(200);
    expect(retry.body.phase.score).toBe(75);
  });

  it("a model that throws during question generation gives a retryable error", async () => {
    const user = await db.newUser();
    mocked.mockRejectedValue(new Error("Groq is rate-limiting this key"));
    const res = await handleStart(request("/api/adventure/start", { level_id: "sv_1" }), makeDeps(db, user, realAdventureAi)).then(read);
    expect(res.status).toBe(502);
    expect(res.body.retryable).toBe(true);
    mocked.mockReset();
  });
});
