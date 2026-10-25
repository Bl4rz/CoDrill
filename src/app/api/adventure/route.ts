import { NextResponse } from "next/server";
import { loadAdventure } from "@/lib/adventure/server";
import { requireUser, serverError } from "@/lib/progression/http";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    return NextResponse.json(await loadAdventure(auth.userId));
  } catch (err) {
    return serverError(err);
  }
}
