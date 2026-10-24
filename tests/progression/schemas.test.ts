import { describe, expect, it } from "vitest";
import { claimQuestBody, roleSummarySchema, runQuery, scoreIds, timezoneBody } from "@/lib/progression/schemas";
import { hashPosting } from "@/lib/progression/server";

const uuid = "123e4567-e89b-42d3-a456-426614174000";

describe("request validation ignores anything the client says about rewards", () => {
  it("claim body keeps only the quest id", () => {
    const parsed = claimQuestBody.parse({ quest_id: "finish_1", xp: 9999, coins: 9999, amount: 1e9 });
    expect(parsed).toEqual({ quest_id: "finish_1" });
  });

  it("score ids keep only the two ids", () => {
    const parsed = scoreIds.parse({ session_id: uuid, question_id: uuid, xp: 500, reward: { xp: 500 }, level: 50 });
    expect(parsed).toEqual({ session_id: uuid, question_id: uuid });
  });

  it("rejects malformed ids and empty or oversized values", () => {
    expect(scoreIds.safeParse({ session_id: "not-a-uuid" }).success).toBe(false);
    expect(runQuery.safeParse({ session_id: null }).success).toBe(false);
    expect(claimQuestBody.safeParse({ quest_id: "" }).success).toBe(false);
    expect(claimQuestBody.safeParse({ quest_id: "x".repeat(65) }).success).toBe(false);
    expect(timezoneBody.safeParse({ timezone: "" }).success).toBe(false);
  });

  it("role summaries are bounded", () => {
    const ok = { role_title: "Backend Engineer", seniority: "Mid", tech_stack: ["Node"], focus_areas: ["APIs"] };
    expect(roleSummarySchema.safeParse(ok).success).toBe(true);
    expect(roleSummarySchema.safeParse({ ...ok, tech_stack: Array(41).fill("x") }).success).toBe(false);
    expect(roleSummarySchema.safeParse({ ...ok, role_title: "x".repeat(201) }).success).toBe(false);
    expect(roleSummarySchema.safeParse({ ...ok, tech_stack: "Node" }).success).toBe(false);
  });
});

describe("posting hash", () => {
  const base = { role_title: "Backend Engineer", seniority: "Mid-level", tech_stack: ["Node.js", "Postgres"], focus_areas: ["APIs", "Caching"] };

  it("ignores case, spacing and ordering", () => {
    expect(hashPosting({ ...base, role_title: "  backend engineer ", tech_stack: ["postgres", "NODE.JS"], focus_areas: ["caching", "apis"] })).toBe(
      hashPosting(base),
    );
  });

  it("ignores seniority but changes with the role, stack or focus", () => {
    expect(hashPosting({ ...base, seniority: "Senior" })).toBe(hashPosting(base));
    expect(hashPosting({ ...base, role_title: "Frontend Engineer" })).not.toBe(hashPosting(base));
    expect(hashPosting({ ...base, tech_stack: ["Node.js"] })).not.toBe(hashPosting(base));
    expect(hashPosting({ ...base, focus_areas: ["APIs"] })).not.toBe(hashPosting(base));
  });
});
