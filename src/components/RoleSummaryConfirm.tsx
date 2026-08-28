"use client";

import { useState } from "react";
import { RoleSummary } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

function TagEditor({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v) => (
          <span
            key={v}
            className="group inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs text-foreground"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-muted opacity-60 hover:text-accent-red hover:opacity-100"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
          }
        }}
        onBlur={addTag}
        placeholder="Add and press Enter"
        className="w-full rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-accent-green focus:outline-none"
      />
    </div>
  );
}

export function RoleSummaryConfirm({
  summary,
  onConfirm,
  onBack,
}: {
  summary: RoleSummary;
  onConfirm: (summary: RoleSummary) => void;
  onBack: () => void;
}) {
  const [edited, setEdited] = useState<RoleSummary>(summary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      onConfirm(edited);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">
          Extracted from the posting — edit anything that looks off
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Role title
            </label>
            <input
              value={edited.role_title}
              onChange={(e) => setEdited({ ...edited, role_title: e.target.value })}
              className="w-full rounded-md border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-foreground focus:border-accent-green focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Seniority
            </label>
            <input
              value={edited.seniority}
              onChange={(e) => setEdited({ ...edited, seniority: e.target.value })}
              className="w-full rounded-md border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-foreground focus:border-accent-green focus:outline-none"
            />
          </div>
        </div>
      </div>

      <TagEditor
        label="Tech stack"
        values={edited.tech_stack}
        onChange={(v) => setEdited({ ...edited, tech_stack: v })}
      />
      <TagEditor
        label="Focus areas"
        values={edited.focus_areas}
        onChange={(v) => setEdited({ ...edited, focus_areas: v })}
      />

      {error && <p className="text-sm text-accent-red">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-raised"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-md bg-accent-green px-4 py-2 text-sm font-medium text-background transition hover:scale-[1.03] hover:bg-accent-green/90 active:scale-[0.97] disabled:opacity-40 disabled:hover:scale-100"
        >
          {loading ? "Generating questions…" : "Looks good — generate questions"}
        </button>
        {loading && <Spinner />}
      </div>
    </div>
  );
}
