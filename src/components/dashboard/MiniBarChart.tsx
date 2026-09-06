interface BarDatum {
  label: string;
  value: number;
}

/**
 * A small activity-over-time bar chart. Heights are computed in pixels
 * against an explicit container height rather than percentages, so it
 * doesn't depend on flex-height quirks from an ancestor.
 */
export function MiniBarChart({
  data,
  color = "var(--accent-green)",
  height = 110,
}: {
  data: BarDatum[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
            <span className="mb-1 text-[9px] text-muted">{d.value > 0 ? d.value : ""}</span>
            <div
              className="w-full rounded-sm"
              style={{
                height: d.value > 0 ? `${Math.max(6, (d.value / max) * (height - 16))}px` : "3px",
                backgroundColor: d.value > 0 ? color : "var(--border)",
                opacity: d.value > 0 ? 1 : 0.4,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center text-[9px] text-muted">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
