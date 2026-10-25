import {
  DAILY_QUEST_COUNT,
  LANGUAGES,
  NEW_LANGUAGE_LOOKBACK_DAYS,
  QUESTS,
  type QuestDefinition,
} from "@/lib/progression/config";

/** One stored question result, as read from the database. */
export interface ResultRow {
  created_at: string;
  difficulty: "easy" | "medium" | "hard";
  language: string;
  correctness: number;
  communication: number;
  reasoning: number;
}

/** Adventure facts the quest engine needs. Absent for callers that don't have them. */
export interface AdventureQuestData {
  bossUnlocked: boolean;
  /** Passed attempts (replays included), each with when it finished and whether it was the boss */
  recentPasses: { finished_at: string; is_boss: boolean }[];
}

export function isValidTimeZone(tz: string): boolean {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The calendar day (YYYY-MM-DD) that `instant` falls on in time zone `tz`. */
export function localDay(instant: Date | string, tz: string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Add whole days to a YYYY-MM-DD string. Pure calendar math, no time zones involved. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Languages used on the `lookbackDays` local days before `today` (today itself excluded). */
export function languagesUsedBefore(results: ResultRow[], tz: string, today: string): Set<string> {
  const from = addDays(today, -NEW_LANGUAGE_LOOKBACK_DAYS);
  const used = new Set<string>();
  for (const r of results) {
    const day = localDay(r.created_at, tz);
    if (day >= from && day < today) used.add(r.language);
  }
  return used;
}

/** Quests that can actually be completed and checked today. */
export function eligibleQuests(
  results: ResultRow[],
  tz: string,
  today: string,
  adventure?: AdventureQuestData,
): QuestDefinition[] {
  const used = languagesUsedBefore(results, tz, today);
  const hasNewLanguage = LANGUAGES.some((l) => !used.has(l));
  return QUESTS.filter((q) => {
    if (q.kind === "new_language") return hasNewLanguage;
    // The boss quest only appears once the boss can actually be fought.
    if (q.kind === "defeat_boss") return adventure?.bossUnlocked === true;
    return true;
  });
}

/** Today's quests for a player: the same player and day always give the same three. */
export function pickDailyQuests(userId: string, day: string, eligible: readonly QuestDefinition[]): QuestDefinition[] {
  const rand = mulberry32(hashString(`${userId}:${day}`));
  const pool = [...eligible];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, DAILY_QUEST_COUNT);
}

/** Progress toward `quest` on local day `today`, from stored results only. Never above the target. */
export function computeQuestProgress(
  quest: QuestDefinition,
  results: ResultRow[],
  tz: string,
  today: string,
  adventure?: AdventureQuestData,
): number {
  const passesToday = (adventure?.recentPasses ?? []).filter((p) => localDay(p.finished_at, tz) === today);
  const todays = results.filter((r) => localDay(r.created_at, tz) === today);
  let count = 0;
  switch (quest.kind) {
    case "finish_questions":
      count = todays.length;
      break;
    case "hard_question":
      count = todays.filter((r) => r.difficulty === "hard").length;
      break;
    case "axis_score":
      count = todays.filter((r) => r[quest.axis!] >= (quest.minScore ?? 0)).length;
      break;
    case "adventure_level":
      count = passesToday.length;
      break;
    case "defeat_boss":
      count = passesToday.filter((p) => p.is_boss).length;
      break;
    case "new_language": {
      const used = languagesUsedBefore(results, tz, today);
      count = todays.filter((r) => !used.has(r.language)).length;
      break;
    }
  }
  return Math.min(quest.target, count);
}
