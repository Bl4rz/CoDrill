import { NextRequest } from "next/server";
import { rpc } from "@/lib/db";
import { realAdventureAi } from "@/lib/adventure/ai";
import type { AdventureDeps } from "@/lib/adventure/handlers";
import { evaluateAndUnlock, getSignedInUserId } from "@/lib/progression/server";
import { guardAi, guardNewSession, refundNewSession } from "@/lib/usage";

/** The production wiring: Supabase, the real session guard, and the real AI. */
export function realAdventureDeps(): AdventureDeps {
  return {
    rpc,
    getUserId: getSignedInUserId,
    guardNewSession: async (req: NextRequest, userId: string) => (await guardNewSession(req, userId)).response,
    guardAi,
    refundStart: refundNewSession,
    unlockAchievements: (userId) => evaluateAndUnlock(userId),
    ai: realAdventureAi,
  };
}
