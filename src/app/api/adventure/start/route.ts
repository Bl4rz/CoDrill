import { NextRequest } from "next/server";
import { realAdventureDeps } from "@/lib/adventure/deps";
import { handleStart } from "@/lib/adventure/handlers";

export const POST = (req: NextRequest) => handleStart(req, realAdventureDeps());
