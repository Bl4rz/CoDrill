import { NextRequest, NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/progression/http";
import { timezoneBody } from "@/lib/progression/schemas";
import { setTimezone } from "@/lib/progression/server";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = timezoneBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Missing timezone." }, { status: 400 });

  try {
    return NextResponse.json(await setTimezone(auth.userId, body.data.timezone));
  } catch (err) {
    return serverError(err);
  }
}
