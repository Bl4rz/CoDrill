import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimit } from "@/lib/rate-limit";

const WINDOW_MS = 10 * 60 * 1000;

// Routes that call a paid third-party API (Groq / ElevenLabs / Azure Speech)
// get a tighter cap — these are the ones an open, unauthenticated route
// could actually cost real money if scripted. Everything else under /api/
// gets a looser default cap. Keyed by exact pathname since none of these
// routes have dynamic segments.
const ROUTE_LIMITS: Record<string, number> = {
  "/api/extract-role": 15,
  "/api/generate-questions": 15,
  "/api/report": 15,
  "/api/interview/approach": 60,
  "/api/interview/followup": 60,
  "/api/interview/score": 60,
  "/api/tts/speak": 120,
};
const DEFAULT_API_LIMIT = 60;

// Named `proxy`, not `middleware` — Next.js 16 deprecated and renamed the
// middleware.ts file convention. Same mechanism, new name.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const limit = ROUTE_LIMITS[pathname] ?? DEFAULT_API_LIMIT;
    if (!checkRateLimit(`${ip}:${pathname}`, limit, WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down and try again in a few minutes." },
        { status: 429 },
      );
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
