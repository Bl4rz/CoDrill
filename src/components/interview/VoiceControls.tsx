"use client";

import { PixelButton } from "@/components/pixel/PixelButton";
import type { InterviewerVoice } from "@/lib/useInterviewerVoice";

/** Preview / Repeat / mute (and a voice picker when the browser voice is in use). */
export function VoiceControls({ voice }: { voice: InterviewerVoice }) {
  const { tts, browserTts, usingBrowserVoice, voiceOn, toggleVoice, lastSpokenText } = voice;
  if (!tts.isSupported) return null;
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
      {usingBrowserVoice && browserTts.voices.length > 1 && (
        <select
          value={browserTts.voiceURI ?? ""}
          onChange={(e) => browserTts.selectVoice(e.target.value)}
          title="Interviewer voice"
          aria-label="Interviewer voice"
          className="max-w-[160px] border-[3px] border-paper bg-ink px-2 py-1.5 text-sm text-paper focus:outline-3 focus:outline-offset-2 focus:outline-amber"
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
