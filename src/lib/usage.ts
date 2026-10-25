import { after, NextRequest, NextResponse } from "next/server";
import { dbConfigured, rpc } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

/**
 * Daily abuse protection for the routes that spend money on AI calls.
 *
 * Counters live in Postgres (public.usage_counters, bumped by the atomic
 * bump_usage() function in supabase/schema.sql) so they survive serverless
 * restarts and are shared across instances. If the service-role key isn't
 * set, or the function hasn't been created yet, they fall back to in-memory
 * counters: per instance and reset on restart, but never wide open.
 *
 * Limits (env vars, all optional):
 *   DAILY_SESSION_LIMIT   new interview sessions per user (or per IP when signed out) per UTC day. Default 3.
 *   GLOBAL_DAILY_AI_CAP   AI requests across the whole site per UTC day. Default 3000.
 *   ENFORCE_LIMITS=true   also enforce while running `next dev` (off by default so local testing isn't throttled).
 */

function intFromEnv(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const dailySessionLimit = () => intFromEnv("DAILY_SESSION_LIMIT", 3);
const globalDailyAiCap = () => intFromEnv("GLOBAL_DAILY_AI_CAP", 3000);

const enforced = () => process.env.NODE_ENV === "production" || process.env.ENFORCE_LIMITS === "true";

const memory = new Map<string, { day: string; count: number }>();

const today = () => new Date().toISOString().slice(0, 10);

function bumpMemory(scope: string, limit: number): boolean {
  const day = today();
  if (memory.size > 5000) {
    for (const [key, entry] of memory) if (entry.day !== day) memory.delete(key);
  }
  const entry = memory.get(scope);
  if (!entry || entry.day !== day) {
    memory.set(scope, { day, count: 1 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

/** Atomically add one to today's counter for `scope`; false means the limit is already reached. */
async function bump(scope: string, limit: number): Promise<boolean> {
  if (dbConfigured()) {
    try {
      const data = await rpc<boolean>("bump_usage", { p_scope: scope, p_limit: limit });
      if (typeof data === "boolean") return data;
    } catch (err) {
      console.error("usage counter unavailable, using in-memory counts:", err instanceof Error ? err.message : err);
    }
  }
  return bumpMemory(scope, limit);
}

/** Give back one counted start for `scope` (see refund_usage in the adventure migration). */
async function refund(scope: string): Promise<void> {
  if (dbConfigured()) {
    try {
      await rpc("refund_usage", { p_scope: scope, p_amount: 1 });
      return;
    } catch (err) {
      console.error("usage refund unavailable, using in-memory counts:", err instanceof Error ? err.message : err);
    }
  }
  const entry = memory.get(scope);
  if (entry && entry.day === today() && entry.count > 0) entry.count -= 1;
}

/** Undo the daily-session count for a start that failed on our side before the player got anything. */
export async function refundNewSession(userId: string): Promise<void> {
  if (!enforced()) return;
  await refund(`sessions:user:${userId}`);
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
  );
}

const capacityResponse = () =>
  NextResponse.json(
    { error: "The server needs a break. Come back tomorrow.", reason: "capacity" },
    { status: 503 },
  );

// Set once the site-wide cap is known to be used up, so later requests on this
// instance are refused instantly without another database trip.
let capacityDay: string | null = null;
// An instance checks the database before its first request, then counts
// requests after the response has been sent instead of making each one wait.
let warmed = false;

/** Call right before any AI request. Returns a response to send back if the site-wide daily cap is hit. */
export async function guardAi(): Promise<NextResponse | null> {
  if (!enforced()) return null;
  if (capacityDay === today()) return capacityResponse();

  if (!warmed) {
    warmed = true;
    if (await bump("global:ai", globalDailyAiCap())) return null;
    capacityDay = today();
    return capacityResponse();
  }

  const countLater = async () => {
    if (!(await bump("global:ai", globalDailyAiCap()))) capacityDay = today();
  };
  try {
    after(countLater);
  } catch {
    // Not inside a request (e.g. under test): just count it now.
    await countLater();
  }
  return null;
}

/**
 * Call right before generating a new set of questions. Limits (when enforced) are
 * per signed-in user, or per IP when signed out, then the site-wide cap. Also
 * returns who the signed-in user is, so the run can be recorded for progression.
 */
export async function guardNewSession(
  req: NextRequest,
  knownUserId?: string | null,
): Promise<{ response: NextResponse | null; userId: string | null }> {
  let userId: string | null = knownUserId ?? null;
  if (knownUserId === undefined) try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Not signed in, or Supabase isn't configured: treated as signed out.
  }

  if (!enforced()) return { response: null, userId };

  const who = userId ? `user:${userId}` : `ip:${clientIp(req)}`;
  if (!(await bump(`sessions:${who}`, dailySessionLimit()))) {
    return {
      response: NextResponse.json(
        {
          error: `You've used your ${dailySessionLimit()} runs for today. Come back tomorrow.`,
          reason: "daily_limit",
        },
        { status: 429 },
      ),
      userId,
    };
  }
  return { response: await guardAi(), userId };
}
