import { NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/progression/http";
import { loadHub } from "@/lib/progression/server";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    return NextResponse.json(await loadHub(auth.userId));
  } catch (err) {
    return serverError(err);
  }
}
