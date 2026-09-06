import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// Natural-sounding, professional defaults — used only as invisible fallback
// voices, never exposed in the voice picker (that only lists ElevenLabs
// voices; see /api/tts/voices).
const EDGE_FALLBACK_VOICE = "en-US-AriaNeural";
const GOOGLE_FALLBACK_VOICE = "en-US-Neural2-C";
const AZURE_FALLBACK_VOICE = "en-US-AriaNeural";

// Uses Microsoft Edge's own "Read Aloud" service — the same neural voices
// Azure Speech sells, reached through the free consumer-facing endpoint
// instead of the paid API. No key, no account, no quota. This is NOT an
// officially sanctioned API for third-party use, though: it's a reverse-
// engineered endpoint (via the msedge-tts package) that Microsoft could
// rate-limit or block at any time with no notice. That's exactly why it
// sits in the middle of this chain rather than replacing anything — if it
// ever stops working, this just throws like any other provider here and
// falls through to Google/Azure/the browser voice, same as normal.
async function speakWithEdge(text: string): Promise<Response> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(EDGE_FALLBACK_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    audioStream.on("end", resolve);
    audioStream.on("error", reject);
  });
  tts.close();

  if (chunks.length === 0) {
    throw new Error("Edge TTS returned no audio.");
  }
  return new Response(Buffer.concat(chunks), {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function speakWithGoogle(text: string): Promise<Response> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Cloud TTS is not configured.");
  }

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "en-US", name: GOOGLE_FALLBACK_VOICE },
        audioConfig: { audioEncoding: "MP3" },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Google Cloud TTS request failed: ${res.status} ${await res.text()}`);
  }

  // Google's REST API returns base64-encoded audio in a JSON envelope, not a
  // raw audio stream like ElevenLabs/Azure — decode it before handing it back.
  const { audioContent } = (await res.json()) as { audioContent: string };
  const audio = Buffer.from(audioContent, "base64");
  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
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

  // ElevenLabs first (highest-quality, most expressive voices, but a small
  // free-tier quota). If it's unconfigured, missing a voiceId, or fails for
  // any reason (quota exhausted, transient error), fall through to Edge TTS,
  // then Google Cloud TTS, then Azure Speech, then finally a clean error —
  // the client never needs to know which provider actually generated the
  // audio, it just gets an mp3 back either way.
  if (process.env.ELEVENLABS_API_KEY && voiceId) {
    try {
      const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
      const audio = await client.textToSpeech.convert(voiceId, {
        text: trimmed,
        // eleven_flash_v2_5 costs half the credits per character of
        // eleven_multilingual_v2 (0.5 vs 1 credit/char) for near-identical
        // quality on English text, and is lower-latency besides — this app
        // never needs multilingual support, so there's no real tradeoff.
        modelId: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5",
        outputFormat: "mp3_44100_128",
        // Without explicit settings the API's own defaults can read as
        // slightly flat or inconsistent take-to-take. stability=0.5 is
        // ElevenLabs' own recommended middle ground (lower drifts erratic,
        // higher goes monotone); style stays at 0 so delivery reads as a
        // measured interviewer, not a performance.
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0,
          useSpeakerBoost: true,
        },
      });
      return new Response(audio, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
      });
    } catch (err) {
      console.error("ElevenLabs TTS failed, falling back to Edge TTS:", err);
    }
  }

  try {
    return await speakWithEdge(trimmed);
  } catch (err) {
    console.error("Edge TTS failed, falling back to Google Cloud TTS:", err);
  }

  try {
    return await speakWithGoogle(trimmed);
  } catch (err) {
    console.error("Google Cloud TTS failed, falling back to Azure:", err);
  }

  try {
    return await speakWithAzure(trimmed);
  } catch (err) {
    console.error("Azure TTS failed:", err);
    return NextResponse.json({ error: "Text-to-speech request failed." }, { status: 502 });
  }
}
