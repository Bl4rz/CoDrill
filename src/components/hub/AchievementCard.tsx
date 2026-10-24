import { AchievementIcon } from "@/components/pixel/achievementIcons";
import type { AchievementView } from "@/lib/progression/types";

/** Unlocked ones show their icon and date; locked ones show a padlock and what it takes. */
export function AchievementCard({ achievement }: { achievement: AchievementView }) {
  const unlocked = achievement.unlocked_at !== null;
  return (
    <li
      className={`flex items-start gap-3 border-[3px] p-3 ${unlocked ? "border-amber" : "border-dashed border-paper"}`}
    >
      <AchievementIcon id={achievement.id} unlocked={unlocked} />
      <div className="min-w-0">
        <p className={`font-display text-base uppercase tracking-wide ${unlocked ? "text-amber" : ""}`}>
          {achievement.name}
        </p>
        <p className="text-sm leading-snug">
          {unlocked
            ? `${achievement.description} Unlocked ${new Date(achievement.unlocked_at!).toLocaleDateString()}.`
            : `Locked. ${achievement.description}`}
        </p>
      </div>
    </li>
  );
}
