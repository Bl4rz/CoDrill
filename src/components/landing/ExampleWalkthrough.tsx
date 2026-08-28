const JOB_EXCERPT =
  '"...Looking for a Backend Engineer with 3+ years in Node.js and distributed systems. Comfortable with concurrent request handling and API design..."';

const QUESTION =
  "Given a stream of incoming API request timestamps, write a function that returns how many requests happened in the last 60 seconds, callable repeatedly as new requests arrive.";

const ANSWER = `function requestsInLastMinute(timestamps, now) {
  return timestamps.filter(t => now - t <= 60000).length;
}`;

const FEEDBACK =
  "Correct, but this re-scans the whole array on every call — O(n) per check. Since requests only ever get added, a sliding window (two-pointer or deque) would get this to amortized O(1). You didn't mention complexity until asked — worth leading with it next time.";

/**
 * A single compact example — not another full "moment" mockup like the
 * TypedTerminal/CodeFollowupPreview/ReportPreview trio below. Multiple
 * reviewers asked for exactly this: one real question → answer → feedback
 * chain, small enough to read in under a minute, before committing to a
 * full session.
 */
export function ExampleWalkthrough() {
  return (
    <div className="card-glass mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-lg border border-border p-5 text-left font-mono text-[13px] leading-relaxed">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wider text-muted">Job posting excerpt</span>
        <p className="text-muted">{JOB_EXCERPT}</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wider text-accent-green">
          → Generated question
        </span>
        <p className="text-foreground">{QUESTION}</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wider text-accent-amber">
          → A short candidate answer
        </span>
        <pre className="overflow-x-auto rounded-md bg-surface-raised/60 p-2 text-foreground">
          {ANSWER}
        </pre>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wider text-accent-amber">
          → The feedback it produces
        </span>
        <p className="text-foreground">{FEEDBACK}</p>
      </div>
    </div>
  );
}
