"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Plays interviewer speech via /api/tts/speak, which tries Edge TTS, then
 * Google Cloud TTS, then Azure Speech server-side (see that route) — this
 * hook never needs to know which one actually generated the audio, it just
 * gets an mp3 back or the request fails outright. `isSupported` flips false
 * the first time a request fails completely (e.g. genuinely offline, or
 * every server-side provider down at once), so the caller can fall back to
 * the browser's own voice (useSpeechSynthesis) instead.
 */
export function useServerSpeech() {
  const [failed, setFailed] = useState(false);

  const queueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Held in a ref (rather than a self-referencing useCallback) since it's
  // recursive: each finished utterance kicks off the next queued one. Ref
  // mutations aren't allowed during render, so it's (re)assigned in an effect
  // that runs after every render instead.
  const playNextRef = useRef<() => void>(() => {});
  useEffect(() => {
    playNextRef.current = () => {
      if (isPlayingRef.current) return;
      const text = queueRef.current.shift();
      if (!text) return;
      isPlayingRef.current = true;

      fetch("/api/tts/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("tts request failed");
          return res.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          currentAudioRef.current = audio;
          const finish = () => {
            URL.revokeObjectURL(url);
            isPlayingRef.current = false;
            currentAudioRef.current = null;
            playNextRef.current();
          };
          audio.onended = finish;
          audio.onerror = finish;
          audio.play().catch(finish);
        })
        .catch(() => {
          setFailed(true);
          isPlayingRef.current = false;
        });
    };
  });

  const speak = useCallback((text: string) => {
    queueRef.current.push(text);
    playNextRef.current();
  }, []);

  const cancel = useCallback(() => {
    queueRef.current = [];
    isPlayingRef.current = false;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, []);

  return { isSupported: !failed, speak, cancel };
}
