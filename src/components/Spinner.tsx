export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-base">
      <span className="flex items-end gap-1.5" role="status" aria-label={label ?? "Loading"}>
        <span className="pixel-dot h-3 w-3 bg-green" style={{ animationDelay: "0ms" }} />
        <span className="pixel-dot h-3 w-3 bg-amber" style={{ animationDelay: "150ms" }} />
        <span className="pixel-dot h-3 w-3 bg-green" style={{ animationDelay: "300ms" }} />
      </span>
      {label && <span>{label}</span>}
    </div>
  );
}
