import { NextResponse } from "next/server";
import { getSignedInUserId, progressionConfigured } from "@/lib/progression/server";

/** Every player route needs a signed-in user and a configured server. Returns the user id or the response to send. */
export async function requireUser(): Promise<{ userId: string } | { response: NextResponse }> {
  if (!progressionConfigured()) {
    return {
      response: NextResponse.json(
        { error: "Progress tracking isn't set up on this server yet.", reason: "progression_unavailable" },
        { status: 503 },
      ),
    };
  }
  const userId = await getSignedInUserId();
  if (!userId) {
    return { response: NextResponse.json({ error: "Sign in to see your progress." }, { status: 401 }) };
  }
  return { userId };
}

export function serverError(err: unknown) {
  console.error(err);
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
}
