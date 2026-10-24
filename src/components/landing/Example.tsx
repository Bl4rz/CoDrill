import { Mascot } from "@/components/pixel/Mascot";
import { SegmentBar } from "@/components/pixel/SegmentBar";
import { GradeBox } from "@/components/pixel/GradeBox";

const QUESTION =
  "Given a stream of request timestamps, write a function that returns how many requests happened in the last 60 seconds. It gets called again every time a new request arrives.";

const CODE = [
  "function requestsInLastMinute(timestamps, now) {",
  "  return timestamps.filter(t => now - t <= 60000).length;",
  "}",
];

const FOLLOW_UP =
  "That scans the whole array on every call. What's the time complexity, and what would you change if 10,000 requests a second came in?";

function highlight(line: string) {
  return line.split(/(\bfunction\b|\breturn\b|\b\d+\b)/g).map((part, i) => {
    if (part === "function" || part === "return") {
      return (
        <span key={i} className="text-amber">
          {part}
        </span>
      );
    }
    if (/^\d+$/.test(part)) {
      return (
        <span key={i} className="text-red">
          {part}
        </span>
      );
    }
    return part;
  });
}

function Interviewer({
  expression,
  children,
}: {
  expression: "neutral" | "thinking";
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 border-[3px] border-ink bg-ink p-1">
        <Mascot crop="head" expression={expression} unit="3px" title="Interviewer" />
      </div>
      <p className="pt-1 text-base leading-relaxed text-ink">{children}</p>
    </div>
  );
}

export function Example() {
  return (
    <section id="example" className="mx-auto w-full max-w-3xl scroll-mt-6 px-6 py-20">
      <h2 className="pixel-heading text-center text-3xl sm:text-4xl">What a run looks like</h2>
      <p className="mx-auto mt-4 max-w-xl text-center text-base">
        Here&apos;s a made-up example, not a screenshot of a real session.
      </p>

      <div className="px-dialog mt-10 flex flex-col gap-5 p-5 sm:p-6">
        <p className="w-fit bg-ink px-2 py-1 font-display text-xs uppercase tracking-widest text-paper">
          Example · Backend Engineer, Node.js
        </p>

        <Interviewer expression="neutral">{QUESTION}</Interviewer>

        <pre className="max-w-full overflow-x-auto border-[3px] border-ink bg-ink p-4 text-left text-sm leading-relaxed text-paper">
          <code>
            {CODE.map((line, i) => (
              <span key={i} className="block">
                {highlight(line)}
              </span>
            ))}
          </code>
        </pre>

        <Interviewer expression="thinking">{FOLLOW_UP}</Interviewer>

        <div className="flex flex-col gap-5 bg-ink p-4 text-paper sm:flex-row sm:items-center sm:gap-6">
          <div className="flex flex-1 flex-col gap-3">
            <SegmentBar label="Correctness" value={80} />
            <SegmentBar label="Communication" value={50} />
            <SegmentBar label="Reasoning" value={60} />
          </div>
          <div className="flex justify-center">
            <GradeBox letter="C" label="Question grade" />
          </div>
        </div>
      </div>
    </section>
  );
}
