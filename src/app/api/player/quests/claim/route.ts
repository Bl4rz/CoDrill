import { NextRequest, NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/progression/http";
import { claimQuestBody } from "@/lib/progression/schemas";
import { claimQuest } from "@/lib/progression/server";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  // Only the quest's id is read. Any amount in the body is ignored.
  const body = claimQuestBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Missing quest_id." }, { status: 400 });

  try {
    return NextResponse.json(await claimQuest(auth.userId, body.data.quest_id));
  } catch (err) {
    return serverError(err);
  }
}
