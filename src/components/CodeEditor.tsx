"use client";

import Editor from "@monaco-editor/react";
import { CodeLanguage } from "@/lib/types";

const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  javascript: "JavaScript",
  python: "Python",
  java: "Java",
};

const STARTER_SNIPPETS: Record<CodeLanguage, string> = {
  javascript: "function solve() {\n  \n}\n",
  python: "def solve():\n    pass\n",
  java: "class Solution {\n    \n}\n",
};

export function CodeEditor({
  language,
  onLanguageChange,
  value,
  onChange,
}: {
  language: CodeLanguage;
  onLanguageChange: (lang: CodeLanguage) => void;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-surface-raised px-3 py-2">
        <div className="flex gap-1">
          {(Object.keys(LANGUAGE_LABELS) as CodeLanguage[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                if (lang !== language && (!value || value === STARTER_SNIPPETS[language])) {
                  onChange(STARTER_SNIPPETS[lang]);
                }
                onLanguageChange(lang);
              }}
              className={`rounded px-2.5 py-1 text-xs font-mono transition ${
                lang === language
                  ? "bg-accent-green/15 text-accent-green"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>
      <Editor
        height="420px"
        theme="vs-dark"
        language={language}
        value={value || STARTER_SNIPPETS[language]}
        onChange={(v) => onChange(v ?? "")}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontFamily: "var(--font-geist-mono), monospace",
          padding: { top: 16 },
        }}
      />
    </div>
  );
}
