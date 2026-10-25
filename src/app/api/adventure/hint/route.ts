import { NextRequest } from "next/server";
import { realAdventureDeps } from "@/lib/adventure/deps";
import { handleHint } from "@/lib/adventure/handlers";

export const POST = (req: NextRequest) => handleHint(req, realAdventureDeps());
