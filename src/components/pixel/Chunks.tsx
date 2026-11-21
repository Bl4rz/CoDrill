import type { Tone } from "@/lib/grade";

/** A static segmented bar: `value` of `total` chunks lit. HP, scores and XP all use it. */
export function Chunks({
  value,
  total = 10,
  tone,
  label,
}: {
  value: number;
  total?: number;
  tone: Tone;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex gap-1"
    >
      {Array.from({ length: total }).map((_, i) => (
        <i key={i} className={`chunk${i < value ? ` on chunk-${tone}` : ""}`} />
      ))}
    </div>
  );
}
