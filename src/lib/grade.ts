export type Letter = "A" | "B" | "C" | "D" | "F";

export function letterGrade(score: number): Letter {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

/** Palette variable for a 0-100 score: green is strong, amber is middling, red is weak. */
export function scoreColor(score: number): string {
  if (score >= 70) return "var(--green)";
  if (score >= 50) return "var(--amber)";
  return "var(--red)";
}
