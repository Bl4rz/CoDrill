"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VOICE_STORAGE_KEY = "codrill:elevenlabs-voice-id";

export interface CloudVoice {
  voiceURI: string;
  name: string;
}

/**
 * Human-sounding interviewer voice via ElevenLabs' free tier, when
 * ELEVENLABS_API_KEY is configured server-side. isSupported only flips true
 * once the voice list actually loads, so callers can fall back to the free
 * browser voice (useSpeechSynthesis) whenever this isn't configured or a
 * request fails mid-session (e.g. the free monthly quota runs out).
 */
export function useElevenLabsSpeech() {
  const [isSupported, setIsSupported] = useState(false);
  const [failed, setFailed] = useState(false);
  // Flips true once the initial voice-list fetch has settled either way, so
  // callers know when it's safe to decide between this and the browser voice
  // instead of racing the (synchronous) browser-support check.
  const [ready, setReady] = useState(false);
  const [voices, setVoices] = useState<CloudVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);

  const queueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceURIRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tts/voices")
      .then((res) => (res.ok ? res.json() : { voices: [] }))
      .then((data: { voices: CloudVoice[] }) => {
        if (cancelled) return;
        if (!data.voices?.length) {
          setReady(true);
          return;
        }
        setVoices(data.voices);
        const stored = localStorage.getItem(VOICE_STORAGE_KEY);
        const initial =
          stored && data.voices.some((v) => v.voiceURI === stored)
            ? stored
            : data.voices[0].voiceURI;
        voiceURIRef.current = initial;
        setVoiceURI(initial);
        setIsSupported(true);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
        /* no key configured or network error — caller falls back to browser voice */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectVoice = useCallback((id: string) => {
    voiceURIRef.current = id;
    setVoiceURI(id);
    localStorage.setItem(VOICE_STORAGE_KEY, id);
  }, []);

  // Held in a ref (rather than a self-referencing useCallback) since it's
  // recursive: each finished utterance kicks off the next queued one. Ref
  // mutations aren't allowed during render, so it's (re)assigned in an effect
  // that runs after every render instead.
  const playNextRef = useRef<() => void>(() => {});
  useEffect(() => {
    playNextRef.current = () => {
      if (isPlayingRef.current) return;
      const text = queueRef.current.shift();
      if (!text || !voiceURIRef.current) return;
      isPlayingRef.current = true;

      fetch("/api/tts/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: voiceURIRef.current }),
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

  return { isSupported: isSupported && !failed, ready, voices, voiceURI, selectVoice, speak, cancel };
}
