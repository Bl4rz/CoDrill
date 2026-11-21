import { Mascot, type Expression } from "@/components/pixel/Mascot";
import { GoblinScene } from "@/components/pixel/GoblinSprite";
import { Chunks } from "@/components/pixel/Chunks";
import { GradeBox } from "@/components/pixel/GradeBox";
import { scoreTone } from "@/lib/grade";

// Everything on this page below the hero is an example. Numbers here are made
// up, and every panel says so.

const QUESTION =
  "Given a stream of request timestamps, write a function that returns how many requests happened in the last 60 seconds. It gets called again every time a new request arrives.";

const CODE = [
  "function requestsInLastMinute(timestamps, now) {",
  "  return timestamps.filter(t => now - t <= 60000).length;",
  "}",
];

const FOLLOW_UP =
  "That scans the whole array on every call. What's the time complexity, and what would you change if 10,000 requests a second came in?";

const REPLY =
  "I'd keep a queue and drop old timestamps as new ones arrive, so each call is O(1) on average";

function highlight(line: string) {
  return line.split(/(\bfunction\b|\breturn\b|\b\d+\b)/g).map((part, i) => {
    if (part === "function" || part === "return") {
      return (
        <span key={i} className="k">
          {part}
        </span>
      );
    }
    if (/^\d+$/.test(part)) {
      return (
        <span key={i} className="n">
          {part}
        </span>
      );
    }
    return part;
  });
}

function Interviewer({ expression, who, children }: { expression: Expression; who: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 max-sm:flex-col">
      <div className="portrait">
        <Mascot crop="head" expression={expression} k={2} title="Interviewer" />
      </div>
      <div className="px-dialog min-w-0 flex-1 px-5 py-4 text-[1.0625rem] leading-normal">
        <b className="mb-1 block font-display text-sm font-bold uppercase tracking-[0.06em] text-[#1d7a58]">{who}</b>
        {children}
      </div>
    </div>
  );
}

export function ExampleRun({ className = "" }: { className?: string }) {
  return (
    <article id="example" className={`pixel-panel flex flex-col gap-5 p-5 sm:p-7 ${className}`} aria-labelledby="t-demo">
      <div className="kicker">
        <span>Example run</span>
        <span className="chip">Backend Engineer, Node.js</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 id="t-demo" className="font-display text-[clamp(1.5rem,2.4vw,2rem)] font-bold leading-[1.05]">
          Question 1
        </h3>
        <div className="flex flex-wrap gap-2" aria-label="Phases">
          <span className="phase done">1 Plan</span>
          <span className="phase on">2 Code</span>
          <span className="phase">3 Defend</span>
        </div>
      </div>
      <Interviewer expression="neutral" who="INTERVIEWER">
        {QUESTION}
      </Interviewer>
      <pre className="code-block" tabIndex={0}>
        <code>
          {CODE.map((line, i) => (
            <span key={i} className="block">
              {highlight(line)}
            </span>
          ))}
        </code>
      </pre>
      <Interviewer expression="thinking" who="FOLLOW-UP">
        {FOLLOW_UP}
      </Interviewer>
      <div className="typed text-base">
        {REPLY}
        <span className="cursor" aria-hidden="true" />
      </div>
    </article>
  );
}

export function BossExample({ className = "" }: { className?: string }) {
  const hp = 7;
  return (
    <article id="boss" className={`pixel-panel flex scroll-mt-6 flex-col gap-5 p-5 sm:p-7 ${className}`} aria-labelledby="t-boss">
      <div className="kicker">
        <span>Boss battle</span>
        <span className="chip">Example</span>
      </div>
      <h3 id="t-boss" className="font-display text-[clamp(1.5rem,2.4vw,2rem)] font-bold leading-[1.05]">
        The Debug Goblin
      </h3>
      <div className="mx-auto max-w-full border-[3px] border-line bg-[#0a1a2c] [--k:3] sm:[--k:4]">
        <GoblinScene state="idle" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between font-display text-base font-medium tracking-[0.06em]">
          <span>HP</span>
          <span>{hp} / 10</span>
        </div>
        <Chunks value={hp} tone="red" label={`Boss health, ${hp} of 10`} />
      </div>
      <p className="text-[0.9375rem] text-mute">
        Its health drops when your answers score well. Clicking does nothing.
      </p>
    </article>
  );
}

const SCORES = [
  { label: "Correctness", value: 80 },
  { label: "Communication", value: 50 },
  { label: "Reasoning", value: 60 },
];

export function ReportExample({ className = "" }: { className?: string }) {
  return (
    <article className={`pixel-panel flex flex-col gap-5 p-5 sm:p-7 ${className}`} aria-labelledby="t-rep">
      <div className="kicker">
        <span>Run report</span>
        <span className="chip">Example</span>
      </div>
      <h3 id="t-rep" className="font-display text-[clamp(1.5rem,2.4vw,2rem)] font-bold leading-[1.05]">
        Run complete
      </h3>
      <div className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr] md:gap-14">
        <div className="flex flex-col gap-4">
          {SCORES.map((s) => (
            <div key={s.label}>
              <div className="mb-1.5 flex justify-between text-[0.9375rem]">
                <span>{s.label}</span>
                <span className="font-mono tabular-nums text-mute">{s.value}/100</span>
              </div>
              <Chunks value={Math.round(s.value / 10)} tone={scoreTone(s.value)} label={`${s.label}, ${s.value} out of 100`} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-5 max-sm:flex-col max-sm:items-start">
          <GradeBox letter="C" label="Question grade" />
          <p className="text-base">
            Your code works. You waited to be asked about time complexity. Say it first next time.
          </p>
        </div>
      </div>
    </article>
  );
}
