"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Why not just paste the job posting into ChatGPT?",
    a: "You can — but you'd have to rebuild the interview discipline yourself every time: remembering to ask for the approach first, not caving and giving away the answer when someone's stuck, tracking follow-ups tied to the actual code, and scoring consistently. Codrill enforces all of that automatically, the same way every session, so the practice is actually comparable across attempts.",
  },
  {
    q: "How much does it cost?",
    a: "Your first session is completely free — full flow, every question, the whole report, no card and no signup. After that, it's $12 per session (one new job posting, one new set of questions).",
  },
  {
    q: "How long does a session take?",
    a: "About 20 minutes per question, and you'll get 5-8 questions depending on the role. You don't have to finish all of them in one sitting — the report reflects whatever you've completed.",
  },
  {
    q: "What languages can I code in?",
    a: "JavaScript, Python, and Java, all in a real Monaco-based editor — the same engine behind VS Code.",
  },
  {
    q: "Can I talk instead of typing?",
    a: "Yes. Voice mode lets you speak your approach and follow-up answers out loud, and the interviewer talks back with a human-sounding voice.",
  },
  {
    q: "Does it work with any job posting?",
    a: "Paste a URL or the raw text — it reads the tech stack, seniority, and focus areas itself and builds questions around that.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      {FAQS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.q} className="card-glass overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-medium text-foreground">{item.q}</span>
              <span
                className={`shrink-0 text-lg text-accent-green transition-transform duration-200 ${
                  isOpen ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </button>
            {isOpen && <p className="px-5 pb-4 text-sm leading-relaxed text-muted">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
