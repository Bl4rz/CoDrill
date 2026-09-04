/**
 * In-memory sliding-window rate limiter, keyed per IP + route. Runs inside
 * proxy.ts on every /api/ request. This is per-instance state — on
 * serverless/edge it resets when an isolate recycles and isn't shared across
 * regions, so it's not a bulletproof global limit. It's the practical first
 * line of defense against the actual threat model here (a script or bot
 * hammering an open, unauthenticated route that calls paid Groq/ElevenLabs/
 * Azure APIs), without standing up external infra like Upstash Redis.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so `buckets` can't grow unbounded under distributed
// scraping (many unique IPs). Runs inline rather than on a timer since edge
// runtime has no persistent background timers between invocations.
function sweepExpired(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweepExpired(now);

  const existing = buckets.get(key);
  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}
