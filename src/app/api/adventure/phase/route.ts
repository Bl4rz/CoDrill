import { NextRequest } from "next/server";
import { realAdventureDeps } from "@/lib/adventure/deps";
import { handlePhase } from "@/lib/adventure/handlers";

export const POST = (req: NextRequest) => handlePhase(req, realAdventureDeps());
