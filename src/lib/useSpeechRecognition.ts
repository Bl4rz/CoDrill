"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechRecognition() {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Chrome silently ends a "continuous" session after a few seconds of perceived
  // silence (e.g. while the candidate is still thinking mid-sentence). These refs
  // let onend tell the difference between "the user clicked stop" and "the browser
  // gave up on its own", and restart seamlessly in the latter case instead of just
  // going quiet — which is what made voice input feel broken.
  const wantsListeningRef = useRef(false);
  const sessionBaseRef = useRef("");
  const latestTranscriptRef = useRef("");
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let combined = "";
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript;
      }
      const full = (sessionBaseRef.current + (sessionBaseRef.current ? " " : "") + combined).trim();
      latestTranscriptRef.current = full;
      setTranscript(full);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        return; // transient — onend below restarts automatically
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        wantsListeningRef.current = false;
        setError(
          "Microphone access is blocked. Click the site/lock icon in your address bar, allow microphone access, then try again."
        );
        return;
      }
      if (event.error === "audio-capture") {
        wantsListeningRef.current = false;
        setError("No microphone was found on this device.");
        return;
      }
      if (event.error === "network") {
        setError("Speech recognition needs an internet connection — retrying…");
        return;
      }
      setError("Speech recognition hit an error — try again.");
    };

    recognition.onend = () => {
      if (!wantsListeningRef.current) {
        setIsListening(false);
        return;
      }
      // Browser ended the session on its own while the user is still trying to
      // talk — fold what we have so far and restart without losing it.
      sessionBaseRef.current = latestTranscriptRef.current;
      restartTimeoutRef.current = setTimeout(() => {
        try {
          recognition.start();
        } catch {
          wantsListeningRef.current = false;
          setIsListening(false);
        }
      }, 200);
    };

    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- checking a client-only browser API on mount
    setIsSupported(true);

    return () => {
      wantsListeningRef.current = false;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript("");
    sessionBaseRef.current = "";
    latestTranscriptRef.current = "";
    wantsListeningRef.current = true;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      wantsListeningRef.current = false;
      // start() throws if already started — ignore
    }
  }, []);

  const stop = useCallback(() => {
    wantsListeningRef.current = false;
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isSupported, isListening, transcript, error, start, stop };
}
