const SCORE_SEGMENTS = 10;

// A blocky, segmented meter (10 discrete pixels) instead of a smooth
// progress bar — reads as a retro game HP/XP bar, matching the difficulty
// badges and session-progress pips elsewhere in the same flow.
export function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75 ? "bg-accent-green" : value >= 50 ? "bg-accent-amber" : "bg-accent-red";
  const filled = Math.round((value / 100) * SCORE_SEGMENTS);
  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-pixel text-[10px] text-foreground">{value}</span>
      </div>
      <div className="flex gap-[3px]">
        {Array.from({ length: SCORE_SEGMENTS }).map((_, i) => (
          <div key={i} className={`h-2.5 flex-1 ${i < filled ? color : "bg-surface-raised"}`} />
        ))}
      </div>
    </div>
  );
}
