"use client";

import type { CSSProperties } from "react";
import { motion } from "motion/react";

const fadeIn = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

/**
 * The hero's "Live preview" content — a full question/code/follow-up/score
 * cycle, not just a conversational fragment. A real visitor reported the old
 * version (a character-by-character typewriter starting from an empty box)
 * "looked almost blank" and gave no sense of the actual product: the text
 * genuinely doesn't exist in the DOM until the typing timers fire, so
 * anyone who glances at it before that sees nothing. This is a plain
 * fade-in instead — the content is real and present on first paint, opacity
 * is the only thing animating.
 */
export function HeroPreview() {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="flex flex-col gap-3 font-mono text-[12px] leading-relaxed"
    >
      <motion.p variants={fadeIn} className="text-foreground">
        <span className="text-accent-green">interviewer&gt;</span> Given a stream of incoming API
        request timestamps, write a function that returns how many happened in the last 60
        seconds.
      </motion.p>
      <motion.pre
        variants={fadeIn}
        className="overflow-x-auto rounded-md bg-surface-raised/60 p-2.5 text-foreground"
      >
        {`function requestsInLastMinute(ts, now) {\n  return ts.filter(t => now - t <= 60000).length;\n}`}
      </motion.pre>
      <motion.p variants={fadeIn} className="text-muted">
        <span className="text-accent-amber">follow-up&gt;</span> What happens to this if it&apos;s
        called on every new request as traffic scales up?
      </motion.p>
      <motion.div variants={fadeIn} className="flex items-start gap-2.5">
        <span
          className="pixel-panel shrink-0 border-accent-green/50 px-1.5 py-0.5 font-pixel text-[9px] text-accent-green"
          style={{ "--pixel-shadow": "var(--accent-green)" } as CSSProperties}
        >
          78/100
        </span>
        <span className="text-muted">
          Correct, but this re-scans the array every call — O(n) per check. A sliding window
          would get this to O(1).
        </span>
      </motion.div>
    </motion.div>
  );
}
