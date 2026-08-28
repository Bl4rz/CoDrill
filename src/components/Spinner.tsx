export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-accent-green" />
      {label && <span>{label}</span>}
    </div>
  );
}
