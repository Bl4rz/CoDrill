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
  // Some Chromium-based browsers (Opera/Opera GX among them) expose the
  // SpeechRecognition constructor but can't actually reach a recognition
  // server — the API depends on a vendor-specific backend, and Opera's build
  // isn't authorized for Google's, so every start() fails immediately with a
  // "network" error. That's indistinguishable from a real transient network
  // blip by error code alone, so it kept retrying forever — a mic that spins
  // and never works, with no way to tell it's not going to. Two network
  // errors in a row without ever getting a real result means it's the
  // former, not the latter; give up and say so instead of retrying forever.
  const consecutiveNetworkErrorsRef = useRef(0);

  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      consecutiveNetworkErrorsRef.current = 0;
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
        consecutiveNetworkErrorsRef.current += 1;
        if (consecutiveNetworkErrorsRef.current >= 2) {
          wantsListeningRef.current = false;
          setError(
            "Voice input isn't working in this browser (this is common in Opera/Opera GX — its speech " +
              "recognition backend isn't authorized to reach Google's servers). Try Chrome or Safari, or just type your answer."
          );
          return;
        }
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
    consecutiveNetworkErrorsRef.current = 0;
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
