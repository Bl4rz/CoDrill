"use client";

import { useCallback, useEffect, useState } from "react";

const VOICE_STORAGE_KEY = "codrill:tts-voice-uri";

// Browsers default to whatever voice is first in the list, which is often a
// low-quality offline voice. Rank by name so we prefer natural-sounding
// network/premium voices when one is available, instead of the robotic default.
const QUALITY_HINTS = ["natural", "premium", "enhanced", "google", "online"];

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (QUALITY_HINTS.some((hint) => name.includes(hint))) score += 10;
  if (voice.lang.startsWith("en")) score += 5;
  if (voice.lang === "en-US") score += 1;
  return score;
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}

export function useSpeechSynthesis() {
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- checking a client-only browser API on mount
    setIsSupported(true);

    function loadVoices() {
      const available = window.speechSynthesis.getVoices();
      if (available.length === 0) return;
      setVoices(available);
      setVoiceURI((current) => {
        if (current && available.some((v) => v.voiceURI === current)) return current;
        const stored = localStorage.getItem(VOICE_STORAGE_KEY);
        if (stored && available.some((v) => v.voiceURI === stored)) return stored;
        return pickBestVoice(available)?.voiceURI ?? null;
      });
    }

    loadVoices();
    // Voice list loads asynchronously in most browsers.
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const selectVoice = useCallback((uri: string) => {
    setVoiceURI(uri);
    localStorage.setItem(VOICE_STORAGE_KEY, uri);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = voices.find((v) => v.voiceURI === voiceURI);
      if (voice) utterance.voice = voice;
      // Utterances queue naturally on the browser's synthesis queue, so sequential
      // calls play in order — do not cancel() here or it would cut off the prior line.
      window.speechSynthesis.speak(utterance);
    },
    [voices, voiceURI]
  );

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { isSupported, voices, voiceURI, selectVoice, speak, cancel };
}
