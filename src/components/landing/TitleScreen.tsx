import type { CSSProperties } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Mascot } from "@/components/pixel/Mascot";
import { Sprite } from "@/components/pixel/Sprite";
import { ArrowIcon } from "@/components/pixel/icons";
import { PixelLink } from "@/components/pixel/PixelButton";
import { SoundToggle } from "@/components/pixel/SoundToggle";
import { HudMenu } from "@/components/pixel/HudMenu";
import {
  BENCH,
  BENCH_COLORS,
  HORIZON_BANDS,
  HORIZON_CLOUDS,
  HORIZON_CLOUD_COLORS,
  OFFICE,
  OFFICE_COLORS,
  SKY_CLOUDS,
  SKY_CLOUD_COLORS,
  STARS,
  TREE,
  TREE_COLORS,
} from "@/components/landing/scenery";

const MENU_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#about", label: "About" },
  { href: "#faq", label: "FAQ" },
  { href: "/start", label: "Press start" },
];

const u = (n: number) => `calc(var(--u) * ${n})`;
const GROUND = 6;
const MASCOT_HALF = "calc(var(--m) * 8)";

function Sky() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {STARS.map(([left, top, kind, group], i) => (
        <span
          key={i}
          className={`absolute bg-paper star-${group}`}
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: "var(--u)",
            height: "var(--u)",
            boxShadow:
              kind === 3
                ? "var(--u) 0 0 0 var(--paper), calc(var(--u) * -1) 0 0 0 var(--paper), 0 var(--u) 0 0 var(--paper), 0 calc(var(--u) * -1) 0 0 var(--paper)"
                : undefined,
          }}
        />
      ))}

      {[
        { top: "11%", idx: 0, dur: "170s", delay: "-40s" },
        { top: "60%", idx: 1, dur: "210s", delay: "-150s" },
      ].map((c) => (
        <div
          key={c.idx}
          className="cloud"
          style={{ top: c.top, "--dur": c.dur, "--delay": c.delay } as CSSProperties}
        >
          <Sprite rows={SKY_CLOUDS[c.idx]} colors={SKY_CLOUD_COLORS} />
        </div>
      ))}

      <div className="absolute inset-x-0 flex flex-col-reverse" style={{ bottom: u(GROUND) }}>
        {HORIZON_BANDS.map((band, i) => (
          <div
            key={i}
            className={band.dither ? `dither ${band.dither}` : ""}
            style={{
              height: u(band.h),
              ...(band.dither ? { "--c": band.color } : { background: band.color }),
            } as CSSProperties}
          />
        ))}
      </div>

      {[
        { bottom: u(GROUND + 9), idx: 2, dur: "190s", delay: "-70s" },
        { bottom: u(GROUND + 5), idx: 0, dur: "240s", delay: "-200s" },
      ].map((c) => (
        <div
          key={c.bottom + c.idx}
          className="cloud"
          style={{ bottom: c.bottom, "--dur": c.dur, "--delay": c.delay } as CSSProperties}
        >
          <Sprite rows={HORIZON_CLOUDS[c.idx]} colors={HORIZON_CLOUD_COLORS} />
        </div>
      ))}
    </div>
  );
}

function Scenery() {
  return (
    <div
      className="pointer-events-none relative z-0 w-full"
      style={{ height: `calc(var(--m) * 21 + ${u(GROUND)})` }}
      aria-hidden="true"
    >
      <div className="absolute" style={{ bottom: u(GROUND), right: `calc(50% + ${MASCOT_HALF} + ${u(2 + 13 + 1)})` }}>
        <Sprite rows={TREE} colors={TREE_COLORS} />
      </div>
      <div className="absolute" style={{ bottom: u(GROUND), right: `calc(50% + ${MASCOT_HALF} + ${u(2)})` }}>
        <Sprite rows={BENCH} colors={BENCH_COLORS} />
      </div>
      <div className="absolute" style={{ bottom: u(GROUND), left: `calc(50% + ${MASCOT_HALF} + ${u(4)})` }}>
        <Sprite rows={OFFICE} colors={OFFICE_COLORS} />
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: u(GROUND) }}
      >
        <div className="mascot-idle relative">
          <div className="mascot-eyes-open">
            <Mascot unit="var(--m)" expression="neutral" />
          </div>
          <div className="mascot-eyes-shut absolute inset-0">
            <Mascot unit="var(--m)" expression="blink" />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-ink" style={{ height: u(GROUND), borderTop: `${u(1)} solid var(--green)` }}>
        <div className="dither d4 h-full" style={{ "--c": "var(--green)", height: u(2) } as CSSProperties} />
      </div>
    </div>
  );
}

export function TitleScreen() {
  return (
    <section className="title-screen relative isolate flex min-h-svh flex-col overflow-clip bg-ink">
      <Sky />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-5">
        <Link href="/" className="flex items-center gap-2" aria-label="Codrill home">
          <Logo />
          <span className="font-display text-lg uppercase tracking-widest">Codrill</span>
        </Link>
        <div className="flex items-center gap-3">
          <SoundToggle />
          <a
            href="#how-it-works"
            className="hidden font-display text-sm uppercase tracking-widest text-paper underline decoration-[3px] underline-offset-4 hover:text-amber sm:inline"
          >
            How it works
          </a>
          <HudMenu links={MENU_LINKS} className="sm:hidden" />
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-4 text-center sm:justify-start sm:pb-0 sm:pt-10">
        <h1 className="pixel-title text-[clamp(1.75rem,10.5vw,4.75rem)]">CODRILL</h1>
        <p className="max-w-xl text-lg leading-relaxed text-paper">
          Paste a job posting. Get interview questions made for that job. Practice out loud or in
          code.
        </p>
        <div className="flex flex-col items-center gap-3 pt-1">
          <PixelLink href="/start" size="lg">
            <span className="blink-cursor">
              <ArrowIcon unit="4px" />
            </span>
            Press start
          </PixelLink>
          <p className="font-display text-sm uppercase tracking-widest text-green">Free. No card.</p>
        </div>
      </div>

      <Scenery />
    </section>
  );
}
