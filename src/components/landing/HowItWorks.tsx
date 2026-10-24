import { Sprite, type SpriteColors } from "@/components/pixel/Sprite";
import { ArrowIcon } from "@/components/pixel/icons";

// 12x12 stage icons, one character per art pixel.
const CLIPBOARD = [
  "....AAAA....",
  ".PPPAAAAPPP.",
  ".PPPPPPPPPP.",
  ".PKKKKKKKKP.",
  ".PPPPPPPPPP.",
  ".PKKKKKKPPP.",
  ".PPPPPPPPPP.",
  ".PKKKKKKKKP.",
  ".PPPPPPPPPP.",
  ".PKKKKKPPPP.",
  ".PPPPPPPPPP.",
  ".PPPPPPPPPP.",
];
const CLIPBOARD_COLORS: SpriteColors = {
  A: "var(--amber)",
  P: "var(--paper)",
  K: "var(--ink)",
};

const BUBBLE = [
  "............",
  ".GGGGGGGGGG.",
  ".GGGGGGGGGG.",
  ".GKKGKKGKKG.",
  ".GKKGKKGKKG.",
  ".GGGGGGGGGG.",
  ".GGGGGGGGGG.",
  ".GGGGGGGGGG.",
  "..GGG.......",
  "...GG.......",
  "....G.......",
  "............",
];
const BUBBLE_COLORS: SpriteColors = { G: "var(--green)", K: "var(--ink)" };

const TROPHY = [
  ".AAAAAAAAAA.",
  "AAAAAAAAAAAA",
  "A.AAAAAAAA.A",
  "A.AAAAAAAA.A",
  ".AAAAAAAAAA.",
  "..AAAAAAAA..",
  "...AAAAAA...",
  "....AAAA....",
  ".....AA.....",
  ".....AA.....",
  "...AAAAAA...",
  "..AAAAAAAA..",
];
const TROPHY_COLORS: SpriteColors = { A: "var(--amber)" };

const STAGES = [
  {
    n: 1,
    title: "Paste the posting",
    detail: "Drop in a link or the full text and it works out the role, the stack and what to focus on.",
    rows: CLIPBOARD,
    colors: CLIPBOARD_COLORS,
  },
  {
    n: 2,
    title: "Answer the questions",
    detail: "Explain your plan out loud or in text, write the code, then handle follow-ups about it.",
    rows: BUBBLE,
    colors: BUBBLE_COLORS,
  },
  {
    n: 3,
    title: "Read your report",
    detail: "You get scores for every question, plus the habits that kept showing up.",
    rows: TROPHY,
    colors: TROPHY_COLORS,
  },
];

const DOTS_ACROSS = ["X.X.X.X"];
const DOTS_DOWN = ["X", ".", "X", ".", "X", ".", "X"];
const DOT_COLORS: SpriteColors = { X: "var(--green)" };

function Connector() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center text-green">
      <div className="flex flex-col items-center gap-2 md:hidden">
        <Sprite rows={DOTS_DOWN} colors={DOT_COLORS} unit="3px" />
        <div className="rotate-90">
          <ArrowIcon unit="3px" />
        </div>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <Sprite rows={DOTS_ACROSS} colors={DOT_COLORS} unit="4px" />
        <ArrowIcon unit="4px" />
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl scroll-mt-6 px-6 py-20">
      <h2 className="pixel-heading text-center text-3xl sm:text-4xl">How it works</h2>
      <ol className="mt-12 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {STAGES.flatMap((stage, i) => [
          <li
            key={stage.n}
            className="pixel-panel flex flex-col gap-3 border-paper bg-ink p-5"
            style={{ "--pixel-shadow": "var(--green)" } as React.CSSProperties}
          >
            <Sprite rows={stage.rows} colors={stage.colors} scale={1.5} />
            <p className="font-display text-sm uppercase tracking-widest text-amber">
              Stage {stage.n}
            </p>
            <h3 className="font-display text-2xl uppercase leading-tight tracking-wide">
              {stage.title}
            </h3>
            <p className="text-base leading-relaxed">{stage.detail}</p>
          </li>,
          i < STAGES.length - 1 ? <Connector key={`c${stage.n}`} /> : null,
        ])}
      </ol>
    </section>
  );
}
