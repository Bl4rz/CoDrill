import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Wordmark } from "@/components/Wordmark";
import { StartLink } from "@/components/landing/StartLink";
import { HudSignIn } from "@/components/landing/HudSignIn";
import { HeroScene } from "@/components/landing/HeroScene";
import { SoundToggle } from "@/components/pixel/SoundToggle";
import { HudMenu } from "@/components/pixel/HudMenu";

const MENU_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#boss", label: "Boss battles" },
  { href: "#faq", label: "FAQ" },
  { href: "/start", signedInHref: "/hub", label: "Press start" },
  { label: "Sign in", action: "signin" as const },
];

const NAV_LINK =
  "font-display text-base font-medium text-paper opacity-90 [text-shadow:0_2px_0_var(--shade)] hover:underline hover:opacity-100 decoration-2 underline-offset-[5px]";

/** The title screen: a full-bleed pixel scene with the headline over it, left-aligned. */
export function TitleScreen() {
  return (
    <header className="hero">
      <HeroScene />

      <nav
        aria-label="Main"
        className="absolute inset-x-0 top-0 z-10 flex items-center gap-4 px-[var(--gutter)] py-4 sm:gap-7"
      >
        <Link href="/" className="flex items-center gap-3" aria-label="Codrill home">
          <Logo />
          <Wordmark k={3} />
        </Link>
        <ul className="ml-3 hidden gap-7 lg:flex">
          <li>
            <a href="#how-it-works" className={NAV_LINK}>
              How it works
            </a>
          </li>
          <li>
            <a href="#boss" className={NAV_LINK}>
              Boss battles
            </a>
          </li>
          <li>
            <a href="#faq" className={NAV_LINK}>
              FAQ
            </a>
          </li>
        </ul>
        <span className="flex-1" />
        <SoundToggle />
        <HudSignIn className="max-sm:hidden" />
        <StartLink size="sm" className="hidden sm:inline-flex">
          Start
        </StartLink>
        <HudMenu links={MENU_LINKS} className="sm:hidden" />
      </nav>

      <div className="hero-copy">
        <h1 className="hero-h1">
          Practice the interview for the job you <em>actually want.</em>
        </h1>
        <p className="hero-lede">
          Paste a job posting. Codrill writes questions for that role, then an AI interviewer takes
          you through them: explain your plan, write the code, defend it.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <StartLink size="lg">
            <span className="tri" aria-hidden="true" />
            Press Start
          </StartLink>
          <span className="free-chip notch">Free. No card.</span>
        </div>
      </div>
    </header>
  );
}
