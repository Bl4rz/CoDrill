"use client";

import { useEffect } from "react";
import { Mascot, type Expression } from "@/components/pixel/Mascot";
import { RichText } from "@/components/interview/RichText";
import { Typewriter } from "@/components/pixel/Typewriter";

export interface TranscriptEntry {
  speaker: "interviewer" | "you";
  text: string;
  expression?: Expression;
  /** Shown whole with code formatting, not typed out (used for exercises that contain code) */
  rich?: boolean;
}

export function Avatar({ expression }: { expression: Expression }) {
  return (
    <div className="shrink-0 border-[3px] border-paper bg-ink p-1">
      <Mascot crop="head" expression={expression} unit="3px" title="Interviewer" />
    </div>
  );
}

export function InterviewerLine({
  entry,
  typing,
  onDone,
}: {
  entry: TranscriptEntry;
  typing: boolean;
  onDone: () => void;
}) {
  useEffect(() => {
    if (entry.rich && typing) onDone();
  }, [entry.rich, typing, onDone]);
  return (
    <div className="flex items-start gap-3">
      <Avatar expression={entry.expression ?? "neutral"} />
      <div className="px-dialog min-w-0 flex-1 p-4">
        <p className="mb-1 font-display text-xs uppercase tracking-widest">Interviewer</p>
        {entry.rich ? (
          <RichText text={entry.text} className="flex flex-col gap-2 text-base leading-relaxed" />
        ) : typing ? (
          <Typewriter text={entry.text} onDone={onDone} className="text-base leading-relaxed" />
        ) : (
          <p className="text-base leading-relaxed">{entry.text}</p>
        )}
      </div>
    </div>
  );
}

export function YouLine({ text }: { text: string }) {
  return (
    <div className="ml-auto max-w-[90%] border-[3px] border-green bg-ink p-3 text-left sm:max-w-[80%]">
      <p className="mb-1 font-display text-xs uppercase tracking-widest text-green">You</p>
      <p className="whitespace-pre-wrap text-base leading-relaxed">{text}</p>
    </div>
  );
}
