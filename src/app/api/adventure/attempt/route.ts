import { NextRequest } from "next/server";
import { realAdventureDeps } from "@/lib/adventure/deps";
import { handleAttempt } from "@/lib/adventure/handlers";

export const GET = (req: NextRequest) => handleAttempt(req, realAdventureDeps());
