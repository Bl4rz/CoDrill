"use client";

import { useEffect, useState } from "react";

const SCORES = [
  { label: "Correctness", value: 85, color: "bg-accent-green" },
  { label: "Communication", value: 60, color: "bg-accent-amber" },
  { label: "Reasoning", value: 75, color: "bg-accent-green" },
];

export function ReportPreview() {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface text-left shadow-[0_0_60px_-15px_var(--accent-amber)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-raised px-4 py-2.5">
        <span className="font-mono text-[11px] text-muted">session-report.json</span>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-2">
          {SCORES.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">{s.label}</span>
                <span className="font-mono text-foreground">{s.value}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                <div
                  className={`h-full rounded-full ${s.color} transition-all duration-1000 ease-out`}
                  style={{ width: animated ? `${s.value}%` : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-accent-amber/30 bg-accent-amber/5 p-3">
          <p className="mb-1 text-xs font-medium text-accent-amber">
            Pattern across this session
          </p>
          <p className="text-xs leading-relaxed text-foreground">
            You consistently skip stating time complexity until asked directly — worth leading
            with it next time.
          </p>
        </div>
      </div>
    </div>
  );
}
