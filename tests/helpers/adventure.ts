import { NextRequest } from "next/server";
import { vi } from "vitest";
import type { AdventureAi } from "@/lib/adventure/ai";
import type { AdventureDeps } from "@/lib/adventure/handlers";
import type { Phase } from "@/lib/adventure/config";
import { setRpcTransport } from "@/lib/db";
import { evaluateAndUnlock } from "@/lib/progression/server";
import { guardAi, guardNewSession, refundNewSession } from "@/lib/usage";
import type { TestDb } from "./db";

export interface FakeAi extends AdventureAi {
  scores: Record<Phase, number>;
  calls: { question: number; hint: number; followups: number; score: number };
  lastQuestionInput?: { level: { title: string; topic: string; difficulty: string; is_boss: boolean }; previous: string[] };
  questions: string[];
  fail: { question: boolean; hint: boolean; followups: boolean; score: boolean };
}

let questionCounter = 0;

export function makeFakeAi(scores: Record<Phase, number> = { approach: 80, code: 80, defend: 80 }): FakeAi {
  const ai: FakeAi = {
    scores,
    calls: { question: 0, hint: 0, followups: 0, score: 0 },
    questions: [],
    fail: { question: false, hint: false, followups: false, score: false },
    async generateQuestion(input) {
      ai.calls.question += 1;
      ai.lastQuestionInput = input;
      if (ai.fail.question) throw new Error("model down");
      const queued = ai.questions.shift();
      return queued ?? `Exercise ${++questionCounter} about ${input.level.topic}: write a short function and explain it.`;
    },
    async generateHint(input) {
      ai.calls.hint += 1;
      if (ai.fail.hint) throw new Error("model down");
      return `Think about the ${input.phase} step again. (hint ${ai.calls.hint})`;
    },
    async generateFollowups() {
      ai.calls.followups += 1;
      if (ai.fail.followups) throw new Error("model down");
      return ["What is the time complexity?", "What happens with empty input?"];
    },
    async scorePhase(input) {
      ai.calls.score += 1;
      if (ai.fail.score) throw new Error("model down");
      return { score: ai.scores[input.phase], feedback: `Feedback on the ${input.phase} step.` };
    },
  };
  return ai;
}

/** Real SQL, real usage limits, real achievement checks; only the AI is fake. */
export function makeDeps(db: TestDb, userId: string | null, ai: AdventureAi): AdventureDeps {
  setRpcTransport(db.transport);
  return {
    rpc: db.transport,
    getUserId: async () => userId,
    guardNewSession: async (req, uid) => (await guardNewSession(req, uid)).response,
    guardAi,
    refundStart: refundNewSession,
    unlockAchievements: (uid) => evaluateAndUnlock(uid),
    ai,
  };
}

export const request = (path: string, body?: unknown, method = "POST") =>
  new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
    ...(body === undefined || method === "GET" ? {} : { body: JSON.stringify(body) }),
  });

export async function read(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function enforceLimits(limit = 50) {
  vi.stubEnv("ENFORCE_LIMITS", "true");
  vi.stubEnv("DAILY_SESSION_LIMIT", String(limit));
  vi.stubEnv("GLOBAL_DAILY_AI_CAP", "100000");
}
