"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ADVENTURE } from "@/lib/adventure/config";
import type { LevelView } from "@/lib/adventure/types";
import { ApiError, postJson } from "@/lib/api-client";
import { GoblinSprite } from "@/components/pixel/GoblinSprite";
import { CoinIcon } from "@/components/pixel/icons";
import { PixelButton } from "@/components/pixel/PixelButton";

/** Title, topic, difficulty, reward preview and START. For a locked level it only states what it is waiting for. */
export function LevelDialog({ level, onClose }: { level: LevelView; onClose: () => void }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const boss = level.is_boss;
  const replay = level.status === "completed";
  const locked = level.status === "locked";

  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const { attempt_id } = await postJson<{ attempt_id: string }>("/api/adventure/start", { level_id: level.id });
      router.push(`/adventure/play/${attempt_id}`);
    } catch (err) {
      // A daily-limit or capacity block is shown by the full-screen message instead.
      if (!(err instanceof ApiError && (err.reason === "daily_limit" || err.reason === "capacity"))) {
        setError(err instanceof Error ? err.message : "Couldn't start that level.");
      }
      setStarting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-dialog-title"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-ink p-4"
    >
      <div className="px-dialog flex w-full max-w-md flex-col gap-4 p-6" style={boss ? ({ "--drop": "var(--red)" } as React.CSSProperties) : undefined}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-1 font-display text-xs uppercase tracking-widest ${boss ? "bg-red text-ink" : "bg-ink text-paper"}`}>
            {boss ? "Boss" : `Level ${level.order_index}`}
          </span>
          <span className="border-[3px] px-2 py-0.5 font-display text-xs uppercase tracking-widest" style={{ borderColor: "var(--ink)", color: "var(--ink)" }}>
            <span aria-hidden="true" className="mr-1 inline-block h-2 w-2 align-middle" style={{ background: "var(--ink)" }} />
            {level.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {boss && (
            <div className="shrink-0 bg-ink p-2">
              <GoblinSprite state={replay ? "defeated" : "angry"} crop="head" unit="4px" title="" />
            </div>
          )}
          <h2 id="level-dialog-title" className="pixel-heading text-2xl">
            {level.title}
          </h2>
        </div>

        <p className="text-base leading-relaxed">{level.blurb}</p>
        <p className="text-base">
          <span className="font-display text-xs uppercase tracking-widest">Topic </span>
          {level.topic}
        </p>

        {locked ? (
          <p className="border-[3px] border-dashed border-ink px-3 py-2 text-base">{level.unlock_text}</p>
        ) : (
          <>
            <div className="bg-ink px-3 py-3 text-paper">
              <p className="font-display text-xs uppercase tracking-widest text-amber">
                {replay ? "Replay" : "First clear"}
              </p>
              {replay ? (
                <p className="mt-1 text-base">
                  {level.best_overall !== null && <>Your best score is {level.best_overall}. </>}
                  {ADVENTURE.replayReward.xp > 0
                    ? `Replays pay up to ${ADVENTURE.replayReward.xp} XP.`
                    : "Replays don't pay XP or coins."}
                </p>
              ) : (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 font-display text-base uppercase tracking-widest">
                  <span className="text-green">+{level.reward_xp} XP</span>
                  <span className="flex items-center gap-1 text-amber">
                    <CoinIcon /> +{level.reward_coins}
                  </span>
                </p>
              )}
            </div>
            <p className="text-sm">One question. A level counts as one run toward your daily limit.</p>
          </>
        )}

        {error && (
          <p role="alert" className="border-[3px] border-red px-3 py-2 text-base text-red">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {!locked && (
            <PixelButton ref={primaryRef} onClick={start} disabled={starting}>
              {starting ? "Starting..." : boss ? "Enter boss battle" : replay ? "Replay" : "Start"}
            </PixelButton>
          )}
          <PixelButton ref={locked ? primaryRef : undefined} variant="ghost" onClick={onClose} disabled={starting}>
            {locked ? "Okay" : "Close"}
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
