"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Why not just paste the job posting into ChatGPT?",
    a: "You can. But you'd have to rebuild the interview yourself every time: ask for your approach first, not cave and hand over the answer, ask follow-ups about your actual code, and score it the same way each run. Codrill does that part for you, so one practice run is comparable to the next.",
  },
  {
    q: "How much does it cost?",
    a: "It's free. I built it as a side project.",
  },
  {
    q: "How long does a session take?",
    a: "About 20 minutes per question, and you get 5 to 8 questions. You don't have to finish them all in one sitting. The report covers whatever you've done.",
  },
  {
    q: "What languages can I code in?",
    a: "JavaScript, Python and Java, in the same editor engine VS Code uses.",
  },
  {
    q: "Can I talk instead of typing?",
    a: "Yes. Tap the mic to say your approach and your follow-up answers out loud. The interviewer talks back.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex w-full flex-col gap-3">
      {FAQS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.q} className="border-[3px] border-paper">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-base font-medium text-paper">{item.q}</span>
              <span className="shrink-0 text-xl text-green" aria-hidden="true">
                {isOpen ? "-" : "+"}
              </span>
            </button>
            {isOpen && <p className="px-4 pb-4 text-base leading-relaxed text-paper">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
