"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechSynthesis } from "@/lib/useSpeechSynthesis";
import { useServerSpeech } from "@/lib/useServerSpeech";

/**
 * The interviewer's voice, shared by the normal runner and Adventure. Prefers the
 * server-synthesized voice (Edge TTS, then Google Cloud TTS, then Azure — see
 * /api/tts/speak) and falls back to the browser's own voice only if that is
 * unavailable. Speech stops when the tab is hidden and when the page unmounts.
 */
export function useInterviewerVoice() {
  const browserTts = useSpeechSynthesis();
  const serverTts = useServerSpeech();
  const tts = serverTts.isSupported ? serverTts : browserTts;
  const [voiceOn, setVoiceOn] = useState(true);
  const [lastSpokenText, setLastSpokenText] = useState("");
  const lastSpokenTextRef = useRef("");

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
    usingBrowserVoice: tts === browserTts,
    voiceOn,
    toggleVoice,
    lastSpokenText,
    say,
  };
}

export type InterviewerVoice = ReturnType<typeof useInterviewerVoice>;
