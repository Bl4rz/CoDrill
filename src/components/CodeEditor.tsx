"use client";

import { useState } from "react";
import Editor, { type BeforeMount } from "@monaco-editor/react";
import { CodeLanguage } from "@/lib/types";
import { PALETTE } from "@/lib/palette";

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

const THEME = "codrill";
const hex = (color: string) => color.replace("#", "");

// The editor uses the same five flat colors as the rest of the site. Selection
// is solid paper with ink text rather than a translucent tint.
const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME, {
    base: "vs-dark",
    inherit: false,
    rules: [
      { token: "", foreground: hex(PALETTE.paper), background: hex(PALETTE.ink) },
      { token: "keyword", foreground: hex(PALETTE.amber) },
      { token: "keyword.control", foreground: hex(PALETTE.amber) },
      { token: "string", foreground: hex(PALETTE.green) },
      { token: "number", foreground: hex(PALETTE.red) },
      { token: "comment", foreground: hex(PALETTE.green), fontStyle: "italic" },
      { token: "type", foreground: hex(PALETTE.paper) },
      { token: "delimiter", foreground: hex(PALETTE.paper) },
    ],
    colors: {
      "editor.background": PALETTE.ink,
      "editor.foreground": PALETTE.paper,
      "editorLineNumber.foreground": PALETTE.paper,
      "editorLineNumber.activeForeground": PALETTE.amber,
      "editorCursor.foreground": PALETTE.amber,
      "editor.selectionBackground": PALETTE.paper,
      "editor.selectionForeground": PALETTE.ink,
      "editor.inactiveSelectionBackground": PALETTE.green,
      "editor.lineHighlightBackground": PALETTE.ink,
      "editor.lineHighlightBorder": PALETTE.ink,
      "editorBracketMatch.background": PALETTE.ink,
      "editorBracketMatch.border": PALETTE.amber,
      "editorIndentGuide.background1": PALETTE.ink,
      "editorIndentGuide.activeBackground1": PALETTE.ink,
      "editorWhitespace.foreground": PALETTE.ink,
      "scrollbarSlider.background": PALETTE.paper,
      "scrollbarSlider.hoverBackground": PALETTE.amber,
      "scrollbarSlider.activeBackground": PALETTE.amber,
      "editorWidget.background": PALETTE.ink,
      "editorWidget.border": PALETTE.paper,
      "editorSuggestWidget.background": PALETTE.ink,
      "editorSuggestWidget.border": PALETTE.paper,
      "editorSuggestWidget.selectedBackground": PALETTE.amber,
      "editorSuggestWidget.foreground": PALETTE.paper,
      "list.hoverBackground": PALETTE.ink,
      "list.activeSelectionBackground": PALETTE.amber,
      "list.activeSelectionForeground": PALETTE.ink,
    },
  });
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
  // Monaco needs the real family name, not a CSS variable reference.
  const [fontFamily] = useState(() => {
    const family =
      typeof window === "undefined"
        ? ""
        : getComputedStyle(document.documentElement).getPropertyValue("--f-code").trim();
    return family ? `${family}, monospace` : "monospace";
  });

  return (
    <div className="flex flex-col border-[3px] border-paper">
      <div className="flex flex-wrap gap-2 border-b-[3px] border-paper bg-ink p-2">
        {(Object.keys(LANGUAGE_LABELS) as CodeLanguage[]).map((lang) => (
          <button
            key={lang}
            type="button"
            aria-pressed={lang === language}
            onClick={() => {
              if (lang !== language && (!value || value === STARTER_SNIPPETS[language])) {
                onChange(STARTER_SNIPPETS[lang]);
              }
              onLanguageChange(lang);
            }}
            className={`border-2 px-3 py-1.5 font-display text-xs uppercase tracking-widest ${
              lang === language
                ? "border-amber bg-amber text-ink"
                : "border-paper bg-ink text-paper hover:border-amber hover:text-amber"
            }`}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        ))}
      </div>
      <Editor
        height="420px"
        theme={THEME}
        beforeMount={defineTheme}
        language={language}
        value={value || STARTER_SNIPPETS[language]}
        onChange={(v) => onChange(v ?? "")}
        options={{
          fontSize: 14,
          fontFamily,
          fontLigatures: false,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16 },
          renderLineHighlight: "none",
          guides: { indentation: false },
          cursorStyle: "block",
          cursorBlinking: "solid",
          cursorSmoothCaretAnimation: "off",
          smoothScrolling: false,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 12, horizontalScrollbarSize: 12 },
        }}
      />
    </div>
  );
}
