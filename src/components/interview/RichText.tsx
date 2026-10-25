import { Fragment } from "react";
import { splitFences } from "@/components/interview/fences";

/** Inline `code` inside a line of prose. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/`([^`\n]+)`/g).map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="bg-ink px-1 font-mono text-[0.9em] text-paper">
            {part}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * Plain text with two bits of formatting: fenced blocks become a scrollable code
 * box and `inline code` is set in the code font. Nothing else is interpreted, and
 * everything goes through React's text escaping.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {splitFences(text).map((seg, i) =>
        seg.kind === "code" ? (
          <pre key={i} className="my-3 overflow-x-auto border-[3px] border-ink bg-ink p-3 font-mono text-sm leading-relaxed text-paper">
            <code>{seg.text}</code>
          </pre>
        ) : seg.text.trim() ? (
          <p key={i} className="whitespace-pre-wrap">
            <Inline text={seg.text.trim()} />
          </p>
        ) : null,
      )}
    </div>
  );
}
