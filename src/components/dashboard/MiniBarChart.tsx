interface BarDatum {
  label: string;
  value: number;
}

/**
 * A small activity-over-time bar chart. Heights are computed in pixels
 * against an explicit container height rather than percentages, so it
 * doesn't depend on flex-height quirks from an ancestor. Flat blocks only.
 */
export function MiniBarChart({
  data,
  color = "var(--green)",
  height = 110,
}: {
  data: BarDatum[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div role="img" aria-label="Sessions per day for the last 7 days">
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
            <span className="mb-1 font-display text-xs">{d.value > 0 ? d.value : ""}</span>
            <div
              className="w-full"
              style={{
                height: d.value > 0 ? `${Math.max(8, (d.value / max) * (height - 20))}px` : "4px",
                background: d.value > 0 ? color : "var(--paper)",
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center font-display text-[10px] uppercase tracking-wider">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
