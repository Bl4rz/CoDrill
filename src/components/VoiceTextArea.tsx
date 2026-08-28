"use client";

import { useEffect, useRef } from "react";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function VoiceTextArea({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}) {
  const stt = useSpeechRecognition();
  const baseTextRef = useRef("");

  useEffect(() => {
    if (!stt.isListening) return;
    onChange(baseTextRef.current + (baseTextRef.current ? " " : "") + stt.transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stt.transcript, stt.isListening]);

  function toggleMic() {
    if (stt.isListening) {
      stt.stop();
      return;
    }
    baseTextRef.current = value;
    stt.start();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 pr-11 text-sm text-foreground placeholder:text-muted focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green"
        />
        {stt.isSupported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled}
            title={stt.isListening ? "Stop recording" : "Speak your answer"}
            className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border transition disabled:opacity-40 ${
              stt.isListening
                ? "animate-pulse border-accent-red bg-accent-red/15 text-accent-red"
                : "border-border text-muted hover:border-accent-green hover:text-accent-green"
            }`}
          >
            <MicIcon />
          </button>
        )}
      </div>
      {stt.isListening && <p className="text-xs text-accent-red">Listening…</p>}
      {stt.error && <p className="text-xs text-accent-red">{stt.error}</p>}
    </div>
  );
}
