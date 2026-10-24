import { NextRequest, NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/progression/http";
import { runQuery } from "@/lib/progression/schemas";
import { runSummary } from "@/lib/progression/server";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const query = runQuery.safeParse({ session_id: req.nextUrl.searchParams.get("session_id") });
  if (!query.success) return NextResponse.json({ error: "Missing session_id." }, { status: 400 });

  try {
    return NextResponse.json(await runSummary(auth.userId, query.data.session_id));
  } catch (err) {
    return serverError(err);
  }
}
