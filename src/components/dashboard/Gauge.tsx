/**
 * A semi-circle speedometer gauge: a fixed background arc plus a needle
 * that rotates from -90deg (0%, pointing left) through 0deg (50%, pointing
 * straight up) to +90deg (100%, pointing right). Built as plain SVG rather
 * than a charting library — the whole app's data visuals (ScoreBar, the
 * retro grid background) are hand-built SVG/CSS, not a new dependency.
 */
export function Gauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = -90 + (clamped / 100) * 180;
  const color =
    clamped >= 70 ? "var(--accent-green)" : clamped >= 40 ? "var(--accent-amber)" : "var(--accent-red)";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[180px]" aria-hidden="true">
        <path
          d="M 15 105 A 85 85 0 0 1 185 105"
          fill="none"
          stroke="var(--border)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <line
          x1="100"
          y1="105"
          x2="100"
          y2="28"
          stroke="var(--foreground)"
          strokeWidth="4"
          strokeLinecap="round"
          style={{ transform: `rotate(${angle}deg)`, transformOrigin: "100px 105px" }}
        />
        <circle cx="100" cy="105" r="7" fill="var(--foreground)" />
      </svg>
      <div className="flex w-full max-w-[180px] justify-between px-2 text-[9px] text-muted">
        <span>0%</span>
        <span>100%</span>
      </div>
      <p className="font-pixel text-lg" style={{ color }}>
        {Math.round(clamped)}%
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
