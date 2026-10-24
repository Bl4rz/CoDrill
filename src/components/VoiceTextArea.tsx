"use client";

import { useEffect, useRef } from "react";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { MicIcon } from "@/components/pixel/icons";

export function VoiceTextArea({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 5,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  label?: string;
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
    <div className="flex flex-col gap-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label ?? placeholder}
          rows={rows}
          disabled={disabled}
          className="w-full resize-y border-[3px] border-paper bg-ink px-3 py-2 pr-14 text-base text-paper placeholder:text-green focus:outline-3 focus:outline-offset-2 focus:outline-amber disabled:border-dashed"
        />
        {stt.isSupported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={disabled}
            aria-pressed={stt.isListening}
            aria-label={stt.isListening ? "Stop recording" : "Speak your answer"}
            title={stt.isListening ? "Stop recording" : "Speak your answer"}
            className={`absolute right-2 top-2 flex h-10 w-10 items-center justify-center border-[3px] disabled:border-dashed ${
              stt.isListening
                ? "border-red bg-red text-ink"
                : "border-paper bg-ink text-paper hover:border-amber hover:text-amber"
            }`}
          >
            <MicIcon />
          </button>
        )}
      </div>
      {stt.isListening && (
        <p className="font-display text-sm uppercase tracking-widest text-red">
          <span className="blink-cursor">Recording</span>
        </p>
      )}
      {stt.error && <p className="text-base text-red">{stt.error}</p>}
    </div>
  );
}
