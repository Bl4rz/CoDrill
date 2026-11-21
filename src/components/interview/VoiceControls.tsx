"use client";

import { PixelButton } from "@/components/pixel/PixelButton";
import { Chunks } from "@/components/pixel/Chunks";
import { kokoro } from "@/lib/kokoro/client";
import { KOKORO_VOICES, type KokoroVoiceId } from "@/lib/kokoro/protocol";
import type { InterviewerVoice } from "@/lib/useInterviewerVoice";

const FIELD =
  "max-w-[190px] border-[3px] border-line bg-ink px-2 py-1.5 text-sm text-paper focus:outline-3 focus:outline-offset-2 focus:outline-amber";

/** Opt-in "Better voice": downloads about 330 MB once, then runs on this device's GPU. */
function BetterVoice({ voice }: { voice: InterviewerVoice }) {
  const k = voice.kokoro;
  // Only offered where it can actually run; the device check happens in the store, after hydration.
  if (k.supported !== true && k.status !== "failed") return null;

  if (k.status === "loading") {
    return (
      <div className="flex w-full flex-col gap-2" role="status" aria-live="polite">
        <p className="font-display text-sm font-medium uppercase tracking-widest">
          Downloading the better voice, {k.pct}%
        </p>
        <Chunks value={Math.round(k.pct / 10)} tone="green" label={`Voice download, ${k.pct} percent`} />
        <p className="text-sm text-mute">Keep using the standard voice meanwhile. This is a one-time download.</p>
      </div>
    );
  }

  if (k.status === "ready") {
    return (
      <>
        <PixelButton variant="amber" size="sm" aria-pressed onClick={() => kokoro.disable()} title="Go back to the standard voice">
          Better voice on
        </PixelButton>
        <select
          value={k.voice}
          onChange={(e) => kokoro.setVoice(e.target.value as KokoroVoiceId)}
          title="Better voice"
          aria-label="Better voice"
          className={FIELD}
        >
          {KOKORO_VOICES.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <PixelButton
        variant="ghost"
        size="sm"
        aria-pressed={false}
        onClick={() => kokoro.enable()}
        title="A more natural voice that runs on your device. Downloads about 330 MB once."
      >
        Better voice (330 MB)
      </PixelButton>
      {k.status === "failed" && k.message && (
        <p role="status" className="text-sm text-mute">
          {k.message}
        </p>
      )}
    </div>
  );
}

/** Preview / Repeat / mute, the opt-in better voice, and a voice picker when the browser voice is in use. */
export function VoiceControls({ voice }: { voice: InterviewerVoice }) {
  const { tts, browserTts, usingBrowserVoice, voiceOn, toggleVoice, lastSpokenText } = voice;
  if (!tts.isSupported && voice.kokoro.supported !== true && voice.kokoro.status !== "failed") return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PixelButton
        variant="ghost"
        size="sm"
        onClick={() => tts.speak("Hi, I'm your interviewer for today's session.")}
        title="Preview this voice"
      >
        Preview voice
      </PixelButton>
      {lastSpokenText && (
        <PixelButton
          variant={tts.isSpeaking ? "danger" : "ghost"}
          size="sm"
          onClick={() => {
            if (tts.isSpeaking) {
              tts.cancel();
            } else {
              tts.speak(lastSpokenText);
            }
          }}
          title={tts.isSpeaking ? "Stop" : "Repeat the last thing the interviewer said"}
        >
          {tts.isSpeaking ? "Stop" : "Repeat"}
        </PixelButton>
      )}
      <PixelButton
        variant={voiceOn ? "amber" : "ghost"}
        size="sm"
        aria-pressed={voiceOn}
        onClick={toggleVoice}
        title={voiceOn ? "Mute interviewer voice" : "Unmute interviewer voice"}
      >
        Voice {voiceOn ? "on" : "off"}
      </PixelButton>
      <BetterVoice voice={voice} />
      {usingBrowserVoice && browserTts.voices.length > 1 && (
        <select
          value={browserTts.voiceURI ?? ""}
          onChange={(e) => browserTts.selectVoice(e.target.value)}
          title="Interviewer voice"
          aria-label="Interviewer voice"
          className={FIELD}
        >
          {browserTts.voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
