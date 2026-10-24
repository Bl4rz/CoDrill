import { describe, expect, it } from "vitest";
import { DAILY_QUEST_COUNT, QUESTS } from "@/lib/progression/config";
import {
  addDays,
  computeQuestProgress,
  eligibleQuests,
  isValidTimeZone,
  languagesUsedBefore,
  localDay,
  pickDailyQuests,
  type ResultRow,
} from "@/lib/progression/quests";

const quest = (id: string) => QUESTS.find((q) => q.id === id)!;

function result(created_at: string, over: Partial<ResultRow> = {}): ResultRow {
  return {
    created_at,
    difficulty: "easy",
    language: "javascript",
    correctness: 50,
    communication: 50,
    reasoning: 50,
    ...over,
  };
}

describe("local day and time zones", () => {
  const instant = "2026-10-25T03:30:00Z";

  it("puts the same instant on different calendar days in different zones", () => {
    expect(localDay(instant, "UTC")).toBe("2026-10-25");
    expect(localDay(instant, "America/Los_Angeles")).toBe("2026-10-24"); // 20:30 PDT
    expect(localDay(instant, "Pacific/Auckland")).toBe("2026-10-25"); // 16:30 NZDT
    expect(localDay(instant, "Asia/Kolkata")).toBe("2026-10-25"); // 09:00 IST
  });

  it("rolls over at local midnight, to the second", () => {
    // Los Angeles is UTC-7 until Nov 1: midnight local is 07:00Z
    expect(localDay("2026-10-25T06:59:59Z", "America/Los_Angeles")).toBe("2026-10-24");
    expect(localDay("2026-10-25T07:00:00Z", "America/Los_Angeles")).toBe("2026-10-25");
    // Kolkata is UTC+5:30: midnight local is 18:30Z the day before
    expect(localDay("2026-10-24T18:29:59Z", "Asia/Kolkata")).toBe("2026-10-24");
    expect(localDay("2026-10-24T18:30:00Z", "Asia/Kolkata")).toBe("2026-10-25");
  });

  it("handles the day clocks go back (DST end, Los Angeles, Nov 1 2026)", () => {
    expect(localDay("2026-11-01T08:30:00Z", "America/Los_Angeles")).toBe("2026-11-01"); // 01:30 PDT
    expect(localDay("2026-11-01T09:30:00Z", "America/Los_Angeles")).toBe("2026-11-01"); // 01:30 PST (second time)
    expect(localDay("2026-11-02T07:59:59Z", "America/Los_Angeles")).toBe("2026-11-01"); // 23:59:59 PST
    expect(localDay("2026-11-02T08:00:00Z", "America/Los_Angeles")).toBe("2026-11-02");
  });

  it("adds days across month, year and leap-day boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(addDays("2026-10-24", -7)).toBe("2026-10-17");
  });

  it("validates time zone names", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("x".repeat(100))).toBe(false);
  });
});

describe("picking the daily quests", () => {
  const all = QUESTS;

  it("picks 3 distinct quests from the eligible list", () => {
    const picked = pickDailyQuests("user-1", "2026-10-24", all);
    expect(picked).toHaveLength(DAILY_QUEST_COUNT);
    expect(new Set(picked.map((q) => q.id)).size).toBe(DAILY_QUEST_COUNT);
  });

  it("is deterministic for the same player and day", () => {
    const a = pickDailyQuests("user-1", "2026-10-24", all).map((q) => q.id);
    const b = pickDailyQuests("user-1", "2026-10-24", all).map((q) => q.id);
    expect(a).toEqual(b);
  });

  it("varies across days and players", () => {
    const sets = new Set<string>();
    for (let d = 0; d < 14; d++) {
      sets.add(
        pickDailyQuests("user-1", addDays("2026-10-01", d), all)
          .map((q) => q.id)
          .sort()
          .join(","),
      );
    }
    expect(sets.size).toBeGreaterThan(3);
  });

  it("only ever picks eligible quests", () => {
    const eligible = all.filter((q) => q.kind !== "new_language");
    for (let d = 0; d < 30; d++) {
      const picked = pickDailyQuests("user-2", addDays("2026-10-01", d), eligible);
      expect(picked.some((q) => q.kind === "new_language")).toBe(false);
    }
  });
});

describe("quest progress is computed from stored results", () => {
  const tz = "America/Los_Angeles";
  const today = "2026-10-24";
  // 2026-10-24 local (PDT, UTC-7) = 07:00Z on the 24th to 06:59:59Z on the 25th
  const todayAt = (hhmmZ: string) => `2026-10-24T${hhmmZ}:00Z`;

  it("counts finished questions today and caps at the target", () => {
    const rows = [1, 2, 3, 4, 5].map((i) => result(todayAt(`1${i}:00`)));
    expect(computeQuestProgress(quest("finish_3"), rows, tz, today)).toBe(3);
    expect(computeQuestProgress(quest("finish_1"), rows, tz, today)).toBe(1);
  });

  it("does not count yesterday or tomorrow in the player's zone", () => {
    const rows = [
      result("2026-10-24T06:59:00Z"), // 23:59 local on the 23rd
      result("2026-10-25T07:00:00Z"), // 00:00 local on the 25th
    ];
    expect(computeQuestProgress(quest("finish_1"), rows, tz, today)).toBe(0);
  });

  it("uses the player's zone, not UTC, to decide what 'today' means", () => {
    const rows = [result("2026-10-25T03:30:00Z")];
    expect(computeQuestProgress(quest("finish_1"), rows, "America/Los_Angeles", "2026-10-24")).toBe(1);
    expect(computeQuestProgress(quest("finish_1"), rows, "UTC", "2026-10-24")).toBe(0);
    expect(computeQuestProgress(quest("finish_1"), rows, "UTC", "2026-10-25")).toBe(1);
  });

  it("checks score thresholds inclusively", () => {
    const at70 = [result(todayAt("18:00"), { communication: 70 })];
    const at69 = [result(todayAt("18:00"), { communication: 69 })];
    expect(computeQuestProgress(quest("communication_70"), at70, tz, today)).toBe(1);
    expect(computeQuestProgress(quest("communication_70"), at69, tz, today)).toBe(0);
    // a high score on a different axis does not count
    expect(computeQuestProgress(quest("reasoning_70"), at70, tz, today)).toBe(0);
  });

  it("counts a hard question only if it is hard", () => {
    expect(computeQuestProgress(quest("hard_1"), [result(todayAt("18:00"), { difficulty: "medium" })], tz, today)).toBe(0);
    expect(computeQuestProgress(quest("hard_1"), [result(todayAt("18:00"), { difficulty: "hard" })], tz, today)).toBe(1);
  });

  it("counts a language only if it was not used in the 7 local days before today", () => {
    const earlier = result("2026-10-20T18:00:00Z", { language: "javascript" });
    const jsToday = result(todayAt("18:00"), { language: "javascript" });
    const pyToday = result(todayAt("19:00"), { language: "python" });
    expect(computeQuestProgress(quest("new_language"), [earlier, jsToday], tz, today)).toBe(0);
    expect(computeQuestProgress(quest("new_language"), [earlier, pyToday], tz, today)).toBe(1);
    // a language used 8+ days ago no longer counts as "used this week"
    const old = result("2026-10-10T18:00:00Z", { language: "javascript" });
    expect(computeQuestProgress(quest("new_language"), [old, jsToday], tz, today)).toBe(1);
  });

  it("does not let today's own results count as 'used before today'", () => {
    const rows = [result(todayAt("18:00"), { language: "java" }), result(todayAt("19:00"), { language: "java" })];
    expect(languagesUsedBefore(rows, tz, today).size).toBe(0);
  });

  it("drops the new-language quest when all three languages were used this week", () => {
    const week = ["javascript", "python", "java"].map((language, i) =>
      result(`2026-10-2${i}T18:00:00Z`, { language }),
    );
    expect(eligibleQuests(week, tz, today).some((q) => q.id === "new_language")).toBe(false);
    expect(eligibleQuests([], tz, today).some((q) => q.id === "new_language")).toBe(true);
  });
});
