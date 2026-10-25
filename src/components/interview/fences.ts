export type Segment = { kind: "text"; text: string } | { kind: "code"; text: string };

/**
 * Splits text into prose and fenced code. A fence is 1-3 backticks, an optional language
 * word, then a line break; it closes with the same number of backticks. Models sometimes
 * write one backtick instead of three, so both are treated as a code block. `inline code`
 * on one line is not a fence and stays in the prose.
 */
export function splitFences(text: string): Segment[] {
  const fence = /(`{1,3})[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)\1/g;
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(fence)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ kind: "text", text: text.slice(last, start) });
    out.push({ kind: "code", text: m[2].replace(/^\n+|\s+$/g, "") });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}
