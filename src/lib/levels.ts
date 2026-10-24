import type { Difficulty, InterviewQuestion } from "@/lib/types";

const RANK: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

/** Index of the hardest question; if several tie, the last one is the boss. */
export function bossIndex(questions: InterviewQuestion[]): number {
  let best = 0;
  questions.forEach((q, i) => {
    if (RANK[q.difficulty] >= RANK[questions[best].difficulty]) best = i;
  });
  return best;
}
