"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis";
import { useServerSpeech } from "@/lib/useServerSpeech";
import { kokoro, useKokoro } from "@/lib/kokoro/client";

/**
 * The interviewer's voice, shared by the normal runner and Adventure. If the player
 * opted in to the better voice (Kokoro, running on their device) and it is ready, that
 * is used. Otherwise it prefers the server-synthesized voice (Edge TTS, then Google Cloud TTS, then Azure — see
 * /api/tts/speak) and falls back to the browser's own voice only if that is
 * unavailable. Speech stops when the tab is hidden and when the page unmounts.
 */
export function useInterviewerVoice() {
  const browserTts = useSpeechSynthesis();
  const serverTts = useServerSpeech();
  const kokoroState = useKokoro();
  const betterVoice = kokoroState.status === "ready";
  const standard = serverTts.isSupported ? serverTts : browserTts;
  // Standard voices also stop if the better one takes over mid-line.
  const kokoroSpeaking = kokoroState.speaking;
  const kokoroTts = useMemo(
    () => ({ isSupported: true, isSpeaking: kokoroSpeaking, speak: kokoro.speak, cancel: kokoro.cancel }),
    [kokoroSpeaking],
  );
  const tts = betterVoice ? kokoroTts : standard;
  const [voiceOn, setVoiceOn] = useState(true);
  const [lastSpokenText, setLastSpokenText] = useState("");
  const lastSpokenTextRef = useRef("");

  const wasBetter = useRef(false);
  useEffect(() => {
    // Hand over cleanly: nothing from the old voice keeps talking over the new one.
    if (betterVoice) {
      serverTts.cancel();
      browserTts.cancel();
    } else {
      kokoro.cancel();
      // If the better voice gave up (bad audio, too slow) the line it was in the middle of
      // would just stop. Say the whole line again with the standard voice instead.
      if (wasBetter.current && kokoroState.status === "failed" && voiceOn && lastSpokenTextRef.current && standard.isSupported) {
        standard.speak(lastSpokenTextRef.current);
      }
    }
    wasBetter.current = betterVoice;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on switching engines
  }, [betterVoice]);

  const say = (text: string) => {
    setLastSpokenText(text);
    lastSpokenTextRef.current = text;
    if (voiceOn && tts.isSupported) tts.speak(text);
  };

  useEffect(() => {
    // Switching tabs doesn't unmount the page, so nothing else stops the audio when
    // you look away. Stop it when the tab is hidden, and since you likely missed
    // part of it, replay the same line when you come back.
    function handleVisibilityChange() {
      if (document.hidden) {
        tts.cancel();
      } else if (voiceOn && tts.isSupported && lastSpokenTextRef.current) {
        tts.speak(lastSpokenTextRef.current);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [tts, voiceOn]);

  // Leaving the page (or the runner unmounting) must never leave audio playing.
  const cancelRef = useRef(tts.cancel);
  useEffect(() => {
    cancelRef.current = tts.cancel;
  });
  useEffect(() => () => cancelRef.current(), []);

  const toggleVoice = useCallback(() => {
    setVoiceOn((v) => {
      if (v) cancelRef.current();
      return !v;
    });
  }, []);

  return {
    tts,
    browserTts,
    kokoro: kokoroState,
    usingBrowserVoice: !betterVoice && tts === browserTts,
    voiceOn,
    toggleVoice,
    lastSpokenText,
    say,
  };
}

export type InterviewerVoice = ReturnType<typeof useInterviewerVoice>;
