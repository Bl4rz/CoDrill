import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "@/lib/progression/config";
import { earnedAchievements, type AchievementStats } from "@/lib/progression/achievements";

const none: AchievementStats = { questionsCompleted: 0, maxCommunication: 0, maxReasoning: 0, languages: [], level: 1 };

describe("achievement rules", () => {
  it("earns nothing for a brand new player", () => {
    expect(earnedAchievements(none)).toEqual([]);
  });

  it("First Run after 1 question, Three Down after 3", () => {
    expect(earnedAchievements({ ...none, questionsCompleted: 1 })).toEqual(["first_run"]);
    expect(earnedAchievements({ ...none, questionsCompleted: 2 })).toEqual(["first_run"]);
    expect(earnedAchievements({ ...none, questionsCompleted: 3 })).toEqual(["first_run", "three_down"]);
  });

  it("Clean Explainer and Speed Thinker need 80+ exactly", () => {
    expect(earnedAchievements({ ...none, maxCommunication: 79, maxReasoning: 79 })).toEqual([]);
    expect(earnedAchievements({ ...none, maxCommunication: 80 })).toEqual(["clean_explainer"]);
    expect(earnedAchievements({ ...none, maxReasoning: 80 })).toEqual(["speed_thinker"]);
  });

  it("Polyglot needs two different languages, not two questions", () => {
    expect(earnedAchievements({ ...none, languages: ["java", "java"] })).toEqual([]);
    expect(earnedAchievements({ ...none, languages: ["java", "python"] })).toEqual(["polyglot"]);
  });

  it("Level 5 needs level 5", () => {
    expect(earnedAchievements({ ...none, level: 4 })).toEqual([]);
    expect(earnedAchievements({ ...none, level: 5 })).toEqual(["level_5"]);
  });

  it("only ever returns ids that exist in the achievement list", () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    const everything = earnedAchievements({
      questionsCompleted: 99,
      maxCommunication: 100,
      maxReasoning: 100,
      languages: ["javascript", "python", "java"],
      level: 50,
    });
    expect(everything).toHaveLength(6);
    for (const id of everything) expect(ids.has(id)).toBe(true);
    expect(ACHIEVEMENTS).toHaveLength(6);
  });
});
