import { describe, expect, it } from "vitest";
import { splitFences } from "@/components/interview/fences";

describe("splitFences", () => {
  it("splits a normal three-backtick block from the prose around it", () => {
    expect(splitFences("Fix this:\n```js\nlet a = 1;\n```\nThen explain.")).toEqual([
      { kind: "text", text: "Fix this:\n" },
      { kind: "code", text: "let a = 1;" },
      { kind: "text", text: "\nThen explain." },
    ]);
  });

  it("treats a single-backtick fence that starts a line as a block too", () => {
    const segs = splitFences("The snippet:\n\n`javascript\nconst x = 1;\nx++;\n`\n\nIt is wrong.");
    expect(segs.filter((s) => s.kind === "code")).toEqual([{ kind: "code", text: "const x = 1;\nx++;" }]);
  });

  it("leaves one-line `inline code` in the prose", () => {
    expect(splitFences("Use `for` and `count` here.")).toEqual([{ kind: "text", text: "Use `for` and `count` here." }]);
  });

  it("handles a block that was squashed onto one line after the language word", () => {
    // no line break after the fence: not a block, shown as written rather than guessed at
    expect(splitFences("Example: ```js f(1) // 2```")).toEqual([{ kind: "text", text: "Example: ```js f(1) // 2```" }]);
  });

  it("returns plain text untouched and nothing for empty input", () => {
    expect(splitFences("Just words.")).toEqual([{ kind: "text", text: "Just words." }]);
    expect(splitFences("")).toEqual([]);
  });
});
