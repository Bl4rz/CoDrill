import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Named `proxy`, not `middleware` — Next.js 16 deprecated and renamed the
// middleware.ts file convention. Same mechanism, new name.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
