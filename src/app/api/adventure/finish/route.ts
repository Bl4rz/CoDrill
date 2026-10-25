import { NextRequest } from "next/server";
import { realAdventureDeps } from "@/lib/adventure/deps";
import { handleFinish } from "@/lib/adventure/handlers";

export const POST = (req: NextRequest) => handleFinish(req, realAdventureDeps());
