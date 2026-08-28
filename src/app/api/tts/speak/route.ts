import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function POST(req: NextRequest) {
  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ElevenLabs is not configured." }, { status: 503 });
  }

  const { text, voiceId } = (await req.json()) as { text?: string; voiceId?: string };
  if (!text || typeof text !== "string" || !voiceId || typeof voiceId !== "string") {
    return NextResponse.json({ error: "Missing text or voiceId." }, { status: 400 });
  }

  try {
    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    // Free-tier requests are capped at 2500 characters; interviewer lines are always
    // far shorter than that, so this is just a defensive ceiling.
    const audio = await client.textToSpeech.convert(voiceId, {
      text: text.slice(0, 2000),
      modelId: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
    });

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "ElevenLabs request failed." }, { status: 502 });
  }
}
