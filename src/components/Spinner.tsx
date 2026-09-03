export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span className="flex items-end gap-1" role="status" aria-label={label ?? "Loading"}>
        <span className="pixel-dot h-2 w-2 bg-accent-green" style={{ animationDelay: "0ms" }} />
        <span className="pixel-dot h-2 w-2 bg-accent-amber" style={{ animationDelay: "150ms" }} />
        <span className="pixel-dot h-2 w-2 bg-accent-green" style={{ animationDelay: "300ms" }} />
      </span>
      {label && <span>{label}</span>}
    </div>
  );
}
