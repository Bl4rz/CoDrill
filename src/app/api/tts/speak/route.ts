import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// A natural-sounding, professional default — used only as the invisible
// fallback voice, never exposed in the voice picker (that only lists
// ElevenLabs voices; see /api/tts/voices).
const AZURE_FALLBACK_VOICE = "en-US-AriaNeural";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function speakWithAzure(text: string): Promise<Response> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    throw new Error("Azure Speech is not configured.");
  }

  const ssml =
    `<speak version="1.0" xml:lang="en-US">` +
    `<voice name="${AZURE_FALLBACK_VOICE}">${escapeXml(text)}</voice></speak>`;

  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
      "User-Agent": "Codrill",
    },
    body: ssml,
  });

  if (!res.ok) {
    throw new Error(`Azure Speech request failed: ${res.status} ${await res.text()}`);
  }

  return new Response(res.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const { text, voiceId } = (await req.json()) as { text?: string; voiceId?: string };
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text." }, { status: 400 });
  }
  // Free-tier requests are capped at 2500 characters; interviewer lines are always
  // far shorter than that, so this is just a defensive ceiling.
  const trimmed = text.slice(0, 2000);

  // ElevenLabs first (higher-quality, more expressive voices, but a small
  // free-tier quota). If it's unconfigured, missing a voiceId, or fails for
  // any reason (quota exhausted, transient error), fall through to Azure
  // Speech automatically — the client never needs to know which provider
  // actually generated the audio, it just gets an mp3 back either way.
  if (process.env.ELEVENLABS_API_KEY && voiceId) {
    try {
      const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
      const audio = await client.textToSpeech.convert(voiceId, {
        text: trimmed,
        modelId: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128",
      });
      return new Response(audio, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
      });
    } catch (err) {
      console.error("ElevenLabs TTS failed, falling back to Azure:", err);
    }
  }

  try {
    return await speakWithAzure(trimmed);
  } catch (err) {
    console.error("Azure TTS failed:", err);
    return NextResponse.json({ error: "Text-to-speech request failed." }, { status: 502 });
  }
}
