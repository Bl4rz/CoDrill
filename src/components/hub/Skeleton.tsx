/** Pixel-style loading placeholder: a dashed box with a sparse dither fill. Static, so it also respects reduced motion. */
export function SkeletonBlock({ className = "h-6 w-full" }: { className?: string }) {
  return <div className={`dither d2 ${className}`} style={{ "--c": "var(--paper)" } as React.CSSProperties} aria-hidden="true" />;
}

export function SkeletonPanel({ lines = 2, title = true }: { lines?: number; title?: boolean }) {
  return (
    <div className="flex flex-col gap-3 border-[3px] border-dashed border-paper p-5" aria-hidden="true">
      {title && <SkeletonBlock className="h-5 w-1/3" />}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className={i === lines - 1 ? "h-6 w-2/3" : "h-6 w-full"} />
      ))}
    </div>
  );
}

export function HubSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading your hub">
      <SkeletonPanel lines={3} />
      <SkeletonPanel lines={1} title={false} />
      <SkeletonPanel lines={4} />
      <SkeletonPanel lines={3} />
    </div>
  );
}
