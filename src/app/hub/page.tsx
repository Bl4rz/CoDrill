"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AdventureCard } from "@/components/hub/AdventureCard";
import { PlayerCard } from "@/components/hub/PlayerCard";
import { QuestList } from "@/components/hub/QuestList";
import { RecentRuns } from "@/components/hub/RecentRuns";
import { AchievementCard } from "@/components/hub/AchievementCard";
import { HubSkeleton } from "@/components/hub/Skeleton";
import { PixelButton, PixelLink } from "@/components/pixel/PixelButton";
import { LevelUpDialog } from "@/components/pixel/LevelUpDialog";
import { StatusMessage } from "@/components/hub/StatusMessage";
import { signInWithGoogle } from "@/lib/auth";
import { showToast } from "@/lib/toast";
import { usePlayer } from "@/lib/usePlayer";
import type { ClaimResponse } from "@/lib/progression/types";
import { ArrowIcon } from "@/components/pixel/icons";

const CRUMBS = [{ label: "Home", href: "/" }, { label: "Hub" }];

export default function HubPage() {
  const { state, setState, reload } = usePlayer();
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);

  async function claim(questId: string) {
    if (state.status !== "ready") return;
    setClaiming(questId);
    setClaimError(null);
    try {
      const res = await fetch("/api/player/quests/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quest_id: questId }),
      });
      const body = (await res.json().catch(() => ({}))) as ClaimResponse & { error?: string };
      if (!res.ok) throw new Error(body.error || "Couldn't claim that quest.");

      if (body.status === "claimed" && body.player) {
        const quest = state.data.quests.find((q) => q.id === questId);
        showToast({
          label: "Quest done",
          title: quest?.title ?? "Quest",
          body: quest ? `+${quest.xp} XP and +${quest.coins} coins.` : undefined,
        });
        for (const a of body.unlocked) showToast({ label: "Achievement unlocked", title: a.name, body: a.description });
        if (body.previous_level !== undefined && body.player.level > body.previous_level) {
          setLevelUp({ from: body.previous_level, to: body.player.level });
        }
      } else if (body.status === "not_complete") {
        setClaimError("That quest isn't finished yet.");
      }
      await reload();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Couldn't claim that quest.");
    } finally {
      setClaiming(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-8 sm:py-12">
      <AppHeader crumbs={CRUMBS} />

      {state.status === "loading" && <HubSkeleton />}

      {state.status === "signed_out" && (
        <StatusMessage
          title="Sign in to play"
          action={<PixelButton onClick={() => signInWithGoogle()}>Sign in with Google</PixelButton>}
        >
          Your level, XP and quests are saved to your account. You can still{" "}
          <Link href="/start" className="underline decoration-2 underline-offset-4 hover:text-amber">
            practice without signing in
          </Link>
          , but it won&apos;t earn XP.
        </StatusMessage>
      )}

      {state.status === "unavailable" && (
        <StatusMessage title="Hub is offline" action={<PixelLink href="/start">Start a run anyway</PixelLink>}>
          Progress tracking isn&apos;t set up on this server yet. Runs still work, they just won&apos;t earn XP.
        </StatusMessage>
      )}

      {state.status === "error" && (
        <StatusMessage
          title="Couldn't load"
          action={
            <PixelButton
              onClick={() => {
                setState({ status: "loading" });
                reload();
              }}
            >
              Try again
            </PixelButton>
          }
        >
          {state.message}
        </StatusMessage>
      )}

      {state.status === "ready" && (
        <>
          <PlayerCard player={state.data.player} />

          <PixelLink href="/start" size="lg" className="w-full sm:w-fit">
            <ArrowIcon unit="4px" />
            Start a new run
          </PixelLink>

          <AdventureCard adventure={state.data.adventure} />

          <div className="grid gap-8 lg:grid-cols-2">
            <QuestList quests={state.data.quests} claiming={claiming} error={claimError} onClaim={claim} />
            <div className="flex flex-col gap-8">
              <RecentRuns runs={state.data.recent_runs} />
              <section aria-labelledby="ach-title" className="flex flex-col gap-4">
                <h2 id="ach-title" className="pixel-heading text-xl">
                  Achievements
                </h2>
                {(() => {
                  const unlocked = state.data.achievements
                    .filter((a) => a.unlocked_at)
                    .sort((a, b) => (b.unlocked_at! > a.unlocked_at! ? 1 : -1))
                    .slice(0, 3);
                  return unlocked.length === 0 ? (
                    <p className="border-[3px] border-dashed border-paper p-4 text-base">
                      None yet. Finish a question to earn your first.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {unlocked.map((a) => (
                        <AchievementCard key={a.id} achievement={a} />
                      ))}
                    </ul>
                  );
                })()}
                <Link
                  href="/profile"
                  className="w-fit font-display text-sm uppercase tracking-widest underline decoration-2 underline-offset-4 hover:text-amber"
                >
                  See all on your profile
                </Link>
              </section>
            </div>
          </div>
        </>
      )}

      {levelUp && <LevelUpDialog level={levelUp.to} previousLevel={levelUp.from} onClose={() => setLevelUp(null)} />}
    </main>
  );
}
