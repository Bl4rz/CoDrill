"use client";

import { AchievementCard } from "@/components/hub/AchievementCard";
import { PlayerCard } from "@/components/hub/PlayerCard";
import { SkeletonPanel } from "@/components/hub/Skeleton";
import { usePlayer } from "@/lib/usePlayer";

/** Level, XP, coins and all six achievements, for the top of the profile page. */
export function PlayerSection() {
  const { state } = usePlayer();

  if (state.status === "loading") return <SkeletonPanel lines={3} />;
  if (state.status !== "ready") return null;

  const unlocked = state.data.achievements.filter((a) => a.unlocked_at).length;
  return (
    <section aria-labelledby="player-title" className="flex flex-col gap-6">
      <h2 id="player-title" className="pixel-heading text-2xl">
        Player
      </h2>
      <PlayerCard player={state.data.player} />
      <div className="flex flex-col gap-4">
        <h3 className="font-display text-lg uppercase tracking-widest">
          Achievements {unlocked}/{state.data.achievements.length}
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {state.data.achievements.map((a) => (
            <AchievementCard key={a.id} achievement={a} />
          ))}
        </ul>
      </div>
    </section>
  );
}
