import { describe, expect, it } from "vitest";
import { cleanForSpeech, splitSentences } from "@/lib/kokoro/split";

describe("cleanForSpeech", () => {
  it("does not read code aloud and strips markdown marks", () => {
    expect(cleanForSpeech("Look at `sumEven` now.\n```js\nlet a = 1;\n```\nThen explain **why**.")).toBe(
      "Look at sumEven now. (code shown on screen) Then explain why.",
    );
  });
});

describe("splitSentences", () => {
  it("returns nothing for empty text", () => {
    expect(splitSentences("   ")).toEqual([]);
  });

  it("splits into sentences and keeps each one whole", () => {
    const chunks = splitSentences("Walk me through your plan. What is the time complexity? Why that choice?");
    expect(chunks.join(" ")).toBe("Walk me through your plan. What is the time complexity? Why that choice?");
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("merges tiny fragments instead of making one-word chunks", () => {
    const chunks = splitSentences("Okay. Good. Now tell me how you would test this function.");
    expect(chunks.every((c) => c.length >= 10)).toBe(true);
  });

  it("cuts a very long sentence so no chunk is huge", () => {
    const long = "word, ".repeat(120).trim();
    const chunks = splitSentences(long);
    expect(chunks.length).toBeGreaterThan(1);
    expect(Math.max(...chunks.map((c) => c.length))).toBeLessThanOrEqual(222);
  });
});
