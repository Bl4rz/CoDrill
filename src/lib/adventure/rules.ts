import { ADVENTURE, PHASES, type Phase } from "@/lib/adventure/config";

export type PhaseScores = Partial<Record<Phase, number>>;

const clamp = (n: number) => (Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0);

/** The score the thresholds are compared against: the stored score plus the fairness margin. */
export function favored(score: number): number {
  return Math.min(100, clamp(score) + ADVENTURE.fairnessMargin);
}

/** HP chunks a phase removes from the boss, from its stored score. */
export function phaseDamage(phase: Phase, score: number): number {
  const s = favored(score);
  let chunks = 0;
  for (const [min, c] of ADVENTURE.hpBands[phase]) {
    if (s >= min) chunks = c;
  }
  return chunks;
}

/** Boss HP left, computed only from the phase scores that are stored. */
export function bossHp(scores: PhaseScores): number {
  let damage = 0;
  for (const phase of PHASES) {
    const score = scores[phase];
    if (score !== undefined) damage += phaseDamage(phase, score);
  }
  return Math.max(0, ADVENTURE.bossHp - damage);
}

/** Weighted overall score from all three stored phase scores. */
export function overallScore(scores: Record<Phase, number>): number {
  let total = 0;
  for (const phase of PHASES) total += clamp(scores[phase]) * ADVENTURE.phaseWeights[phase];
  return Math.round(total);
}

export function passes(overall: number): boolean {
  return favored(overall) >= ADVENTURE.passThreshold;
}

/** Boss victory needs HP at zero AND a passing overall score. */
export function isVictory(scores: Record<Phase, number>): boolean {
  return bossHp(scores) === 0 && passes(overallScore(scores));
}

/** Whether a regular level is cleared (no HP involved). */
export function levelPassed(scores: Record<Phase, number>): boolean {
  return passes(overallScore(scores));
}

/** The first phase that hasn't been scored yet, or null when all three are done. */
export function nextPhase(scored: Phase[]): Phase | null {
  return PHASES.find((p) => !scored.includes(p)) ?? null;
}
