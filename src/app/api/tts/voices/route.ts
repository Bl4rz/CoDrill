import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// Voices whose use_case/descriptive labels clearly don't fit a "warm but
// rigorous technical interviewer" persona — think game-character voices,
// hyped social-media energy, or sales-pitch delivery. Filtered out entirely
// rather than just deprioritized: with no curation, the previous version
// would happily let someone pick "Husky Trickster" or "Fierce Warrior" from
// the dropdown, and that choice persists in localStorage indefinitely.
const MISMATCHED_USE_CASES = new Set(["characters_animation", "social_media", "advertisement"]);
const MISMATCHED_DESCRIPTIVES = new Set(["sassy", "hyped", "cute", "rough"]);

// Used only to order the curated list so a good, calm, professional voice
// lands first (the client defaults to whichever voice comes back at
// index 0) — not to exclude anything.
const PREFERRED_DESCRIPTIVES = new Set([
  "professional",
  "confident",
  "warm",
  "calm",
  "reassuring",
  "classy",
  "formal",
]);

function isInterviewerSuited(labels: Record<string, string>): boolean {
  if (labels.language && labels.language !== "en") return false;
  if (labels.use_case && MISMATCHED_USE_CASES.has(labels.use_case)) return false;
  if (labels.descriptive && MISMATCHED_DESCRIPTIVES.has(labels.descriptive)) return false;
  return true;
}

function fitScore(labels: Record<string, string>): number {
  let score = 0;
  if (labels.descriptive && PREFERRED_DESCRIPTIVES.has(labels.descriptive)) score += 5;
  if (labels.use_case === "informative_educational") score += 3;
  else if (labels.use_case === "conversational") score += 2;
  if (labels.accent === "american") score += 1;
  return score;
}

export async function GET() {
  if (!process.env.ELEVENLABS_API_KEY) {
    // No key configured — the client falls back to the free browser voice.
    return NextResponse.json({ voices: [] });
  }

  try {
    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    // Explicit pageSize: the SDK defaults to 10, which was silently cutting
    // off more than half of a typical account's premade voice library.
    const result = await client.voices.search({ pageSize: 100 });
    const voices = (result.voices ?? [])
      .filter((v) => v.name && isInterviewerSuited(v.labels ?? {}))
      .sort((a, b) => fitScore(b.labels ?? {}) - fitScore(a.labels ?? {}))
      .map((v) => ({ voiceURI: v.voiceId, name: v.name as string }));
    return NextResponse.json({ voices });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ voices: [] });
  }
}
