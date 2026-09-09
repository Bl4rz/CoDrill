import { createClient } from "@/lib/supabase/server";

/**
 * Free/paid gating for generating a new set of interview questions.
 * Anonymous (signed-out) users are untouched — always allowed, matching the
 * "first session free, no signup" flow that already exists. Signed-in users
 * get exactly one free generation ever (their first), then need an
 * unconsumed Stripe credit for every one after that.
 *
 * The credit is claimed with the same UPDATE ... WHERE consumed_at IS NULL
 * that decides whether it's available — there's no separate "check" step
 * before the "use" step, so there's no window for a race between two
 * concurrent requests to double-spend one credit.
 */
export async function canGenerateQuestions(): Promise<{
  allowed: boolean;
  reason?: "payment_required";
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { allowed: true };

  const { count, error: countError } = await supabase
    .from("interview_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    // Fail open on our own read error, not on a missing credit — a
    // transient database hiccup shouldn't block a paying user, and this
    // can't be repeatedly exploited since it only fires on a genuine
    // error, never as a substitute for actually having a credit.
    console.error("Session count check failed:", countError.message);
    return { allowed: true };
  }
  if ((count ?? 0) === 0) return { allowed: true };

  const { data, error } = await supabase
    .from("session_credits")
    .update({ consumed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("consumed_at", null)
    .select("id")
    .limit(1);

  if (error || !data || data.length === 0) {
    return { allowed: false, reason: "payment_required" };
  }
  return { allowed: true };
}
