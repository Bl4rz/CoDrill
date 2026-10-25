/**
 * Every tunable number for Adventure lives here. The levels themselves (titles,
 * topics, rewards) are rows in the database, seeded by the migration.
 */

export const PHASES = ["approach", "code", "defend"] as const;
export type Phase = (typeof PHASES)[number];

/** Each phase scores one of the three existing interview skills. */
export const PHASE_INFO: Record<Phase, { title: string; skill: "Communication" | "Correctness" | "Reasoning" }> = {
  approach: { title: "Explain your approach", skill: "Communication" },
  code: { title: "Fix it in code", skill: "Correctness" },
  defend: { title: "Defend your reasoning", skill: "Reasoning" },
};

export const ADVENTURE = {
  /**
   * PASSING: the weighted overall score (below) must reach this. Time and speech
   * speed are never part of any score or decision here.
   */
  passThreshold: 60,
  /**
   * FAIRNESS MARGIN: an AI grader is not exact, so every threshold comparison
   * (pass/fail and the HP bands) is made on score + margin. In effect a score
   * of 57 passes. The stored scores themselves are never changed.
   */
  fairnessMargin: 3,
  /** Overall = weighted average of the three phase scores. */
  phaseWeights: { approach: 0.3, code: 0.4, defend: 0.3 } satisfies Record<Phase, number>,

  /**
   * BOSS HP: 10 chunks. Each phase takes off a fixed number of chunks depending on
   * its stored score, from this table: [lowest score for the band, chunks removed].
   * The best case adds up to exactly 10 (3 + 4 + 3), so the boss only reaches 0 if
   * all three phases went well (roughly 65+, 75+ and 65+ after the margin).
   */
  bossHp: 10,
  hpBands: {
    approach: [[0, 0], [25, 1], [50, 2], [65, 3]],
    code: [[0, 0], [25, 1], [45, 2], [60, 3], [75, 4]],
    defend: [[0, 0], [25, 1], [50, 2], [65, 3]],
  } satisfies Record<Phase, [number, number][]>,

  /** Replaying a level you already finished pays this, never more. Zero keeps replays un-farmable. */
  replayReward: { xp: 0, coins: 0 },

  /** One hint per phase, enforced by the database. */
  hintsPerPhase: 1,

  /** Input size limits (characters) for each phase's submission. */
  limits: { approach: 4000, code: 12000, answer: 3000 },
} as const;
