"use client";

import { useState } from "react";
import { RoleSummary } from "@/lib/types";
import { PixelButton } from "@/components/pixel/PixelButton";

const FIELD =
  "w-full border-[3px] border-paper bg-ink px-3 py-2 text-base text-paper focus:outline-3 focus:outline-offset-2 focus:outline-amber";
const LABEL = "mb-1.5 block font-display text-sm uppercase tracking-widest";

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
      <p className={LABEL}>{label}</p>
      <ul className="mb-3 flex flex-wrap gap-2">
        {values.map((v) => (
          <li
            key={v}
            className="flex items-center gap-2 border-[3px] border-green px-2 py-1 text-sm text-green"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="font-display text-base leading-none text-paper hover:text-red"
              aria-label={`Remove ${v}`}
            >
              x
            </button>
          </li>
        ))}
      </ul>
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
        placeholder="Add one and press Enter"
        className={`${FIELD} placeholder:text-green`}
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
  onConfirm: (summary: RoleSummary) => void | Promise<void>;
  onBack: () => void;
}) {
  const [edited, setEdited] = useState<RoleSummary>(summary);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      await onConfirm(edited);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-base">Here&apos;s what I pulled out of the posting. Fix anything that looks off.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="role-title" className={LABEL}>
            Role title
          </label>
          <input
            id="role-title"
            value={edited.role_title}
            onChange={(e) => setEdited({ ...edited, role_title: e.target.value })}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="seniority" className={LABEL}>
            Seniority
          </label>
          <input
            id="seniority"
            value={edited.seniority}
            onChange={(e) => setEdited({ ...edited, seniority: e.target.value })}
            className={FIELD}
          />
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

      <div className="flex flex-wrap items-center gap-4">
        <PixelButton variant="ghost" onClick={onBack} disabled={loading}>
          Back
        </PixelButton>
        <PixelButton onClick={handleGenerate} disabled={loading}>
          Generate questions
        </PixelButton>
      </div>
    </div>
  );
}
