import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function GET() {
  if (!process.env.ELEVENLABS_API_KEY) {
    // No key configured — the client falls back to the free browser voice.
    return NextResponse.json({ voices: [] });
  }

  try {
    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    const result = await client.voices.search();
    const voices = (result.voices ?? [])
      .filter((v) => v.name)
      .map((v) => ({ voiceURI: v.voiceId, name: v.name as string }));
    return NextResponse.json({ voices });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ voices: [] });
  }
}
