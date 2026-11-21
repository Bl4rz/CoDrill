"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "@/components/pixel/icons";
import { playBlip } from "@/lib/sound";

const FAQS = [
  {
    q: "Why not just paste the job posting into ChatGPT?",
    a: "You can. But you'd have to run the interview yourself every time: ask for your plan first, not cave and hand over the answer, ask follow-ups about your actual code, and score it the same way each run. Codrill does that part, so one practice run is comparable to the next.",
  },
  {
    q: "How much does it cost?",
    a: "It's free. I built it as a side project.",
  },
  {
    q: "Do I need an account?",
    a: "No. You can run a whole session without signing in. Signing in with Google just saves your history so you can see it on another device.",
  },
  {
    q: "How long does a session take?",
    a: "About 20 minutes per question, and you get 5 to 8 questions. You don't have to do them all in one sitting. The report covers whatever you've finished.",
  },
  {
    q: "Can I talk instead of typing?",
    a: "Yes. Tap the mic and say your plan or your follow-up answers out loud, and the interviewer talks back. You can code in JavaScript, Python or Java.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="grid scroll-mt-6 gap-8 pt-[clamp(56px,8vw,112px)] lg:grid-cols-[1fr_2fr] lg:gap-14">
      <h2 className="pixel-heading text-[clamp(1.875rem,3.6vw,3rem)]">FAQ</h2>
      <div className="flex flex-col gap-4">
        {FAQS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.q} className="notch bg-line p-[3px]">
              <div className="notch bg-ink-2 [--n:4px]">
                <button
                  type="button"
                  onClick={() => {
                    playBlip("press");
                    setOpenIndex(isOpen ? null : i);
                  }}
                  className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left hover:text-amber"
                  aria-expanded={isOpen}
                >
                  <span className="text-[1.0625rem] font-medium">{item.q}</span>
                  <span className="shrink-0 text-green" aria-hidden="true">
                    {isOpen ? <MinusIcon /> : <PlusIcon />}
                  </span>
                </button>
                {isOpen && (
                  <p className="border-t-[3px] border-line px-4 py-3 text-[1.0625rem] leading-relaxed text-mute">
                    {item.a}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
