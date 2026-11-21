import type { CSSProperties } from "react";
import { type Letter, type Tone } from "@/lib/grade";
import { art } from "@/lib/art";

const TONE: Record<Letter, Tone> = { A: "green", B: "green", C: "amber", D: "amber", F: "red" };

/** A letter drawn from the baked bitmap font. The display font's C reads as an O, so it is not used here. */
function GradeGlyph({ letter }: { letter: Letter }) {
  const g = art.grades;
  const i = g.letters.indexOf(letter);
  return (
    <span
      className="sprite-box [--k:12] sm:[--k:14]"
      style={{ width: `calc(var(--k) * ${g.fw}px)`, height: `calc(var(--k) * ${g.fh}px)` } as CSSProperties}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled by the image optimizer */}
      <img
        className="sprite-strip"
        src={g.src}
        alt=""
        width={g.w}
        height={g.h}
        style={{
          width: `calc(var(--k) * ${g.w}px)`,
          height: `calc(var(--k) * ${g.h}px)`,
          transform: `translateX(calc(var(--k) * ${-g.fw * i}px))`,
        }}
      />
    </span>
  );
}

/** The big letter grade: a beveled, notched block with a hard offset shadow. */
export function GradeBox({ letter, label = "Grade" }: { letter: Letter; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="inline-flex [filter:drop-shadow(4px_4px_0_var(--shade))]">
        <div
          className={`grade-box notch tone-${TONE[letter]} flex h-28 w-28 items-center justify-center pb-1.5 sm:h-32 sm:w-32`}
          role="img"
          aria-label={`${label} ${letter}`}
        >
          <GradeGlyph letter={letter} />
        </div>
      </span>
      <p className="font-display text-sm font-medium uppercase tracking-widest text-mute">{label}</p>
    </div>
  );
}
