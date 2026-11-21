import { Mascot } from "@/components/pixel/Mascot";

const STAGES = [
  {
    title: "Paste the posting",
    detail: "Drop in a link or the full text and it works out the role, the stack and what to focus on.",
  },
  {
    title: "Answer the questions",
    detail: "Explain your plan out loud or in text, write the code, then handle follow-ups about it.",
  },
  {
    title: "Read your report",
    detail: "You get scores for every question, plus the habits that kept showing up.",
  },
];

/** The three steps, as one tall panel next to the example run. The mascot fills the space under them. */
export function Steps({ className = "" }: { className?: string }) {
  return (
    <article className={`pixel-panel flex flex-col gap-6 p-5 sm:p-7 ${className}`} aria-labelledby="t-steps">
      <div className="kicker">
        <span>The loop</span>
        <span className="chip">3 steps</span>
      </div>
      <h3 id="t-steps" className="font-display text-[clamp(1.5rem,2.4vw,2rem)] font-bold leading-[1.05]">
        From posting to report
      </h3>
      <ol className="flex flex-col gap-6">
        {STAGES.map((stage, i) => (
          <li key={stage.title} className="flex gap-4">
            <span className="grade-box notch flex h-11 w-11 shrink-0 items-center justify-center text-2xl [--n:3px]">
              {i + 1}
            </span>
            <div className="min-w-0">
              <h4 className="font-display text-xl font-bold leading-tight tracking-[0.02em]">{stage.title}</h4>
              <p className="mt-1 text-[1.0625rem] leading-relaxed text-mute">{stage.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-auto flex items-end gap-4 pt-2">
        <Mascot expression="neutral" k={3} />
        <p className="pb-2 text-[0.9375rem] text-mute">No account needed to start a run.</p>
      </div>
    </article>
  );
}
