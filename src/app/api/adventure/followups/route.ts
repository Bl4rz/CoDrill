import { NextRequest } from "next/server";
import { realAdventureDeps } from "@/lib/adventure/deps";
import { handleFollowups } from "@/lib/adventure/handlers";

export const POST = (req: NextRequest) => handleFollowups(req, realAdventureDeps());
