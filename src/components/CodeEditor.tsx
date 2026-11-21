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
      { token: "", foreground: hex(PALETTE.paper), background: hex(PALETTE.shade) },
      { token: "keyword", foreground: hex(PALETTE.green) },
      { token: "keyword.control", foreground: hex(PALETTE.green) },
      { token: "string", foreground: hex(PALETTE.amberL) },
      { token: "number", foreground: hex(PALETTE.amber) },
      { token: "comment", foreground: hex(PALETTE.mute), fontStyle: "italic" },
      { token: "type", foreground: hex(PALETTE.paper) },
      { token: "delimiter", foreground: hex(PALETTE.paper) },
    ],
    colors: {
      "editor.background": PALETTE.shade,
      "editor.foreground": PALETTE.paper,
      "editorLineNumber.foreground": PALETTE.mute,
      "editorLineNumber.activeForeground": PALETTE.amber,
      "editorCursor.foreground": PALETTE.amber,
      "editor.selectionBackground": PALETTE.line,
      "editor.selectionForeground": PALETTE.paper,
      "editor.inactiveSelectionBackground": PALETTE.ink3,
      "editor.lineHighlightBackground": PALETTE.shade,
      "editor.lineHighlightBorder": PALETTE.shade,
      "editorBracketMatch.background": PALETTE.shade,
      "editorBracketMatch.border": PALETTE.amber,
      "editorIndentGuide.background1": PALETTE.shade,
      "editorIndentGuide.activeBackground1": PALETTE.shade,
      "editorWhitespace.foreground": PALETTE.shade,
      "scrollbarSlider.background": PALETTE.line,
      "scrollbarSlider.hoverBackground": PALETTE.amber,
      "scrollbarSlider.activeBackground": PALETTE.amber,
      "editorWidget.background": PALETTE.ink2,
      "editorWidget.border": PALETTE.line,
      "editorSuggestWidget.background": PALETTE.ink2,
      "editorSuggestWidget.border": PALETTE.line,
      "editorSuggestWidget.selectedBackground": PALETTE.amber,
      "editorSuggestWidget.foreground": PALETTE.paper,
      "list.hoverBackground": PALETTE.ink3,
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
    <div className="flex flex-col border-[3px] border-line">
      <div className="flex flex-wrap gap-2 border-b-[3px] border-line bg-ink-2 p-2">
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
            className={`phase min-h-11 uppercase tracking-widest hover:text-amber ${lang === language ? "on hover:text-ink" : ""}`}
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
