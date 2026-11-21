import { TitleScreen } from "@/components/landing/TitleScreen";
import { Steps } from "@/components/landing/HowItWorks";
import { ExampleRun, BossExample, ReportExample } from "@/components/landing/Example";
import { About } from "@/components/landing/About";
import { FAQ } from "@/components/landing/FAQ";
import { StartLink } from "@/components/landing/StartLink";
import { SUPPORT_URL } from "@/lib/site";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <TitleScreen />

      <main className="mx-auto w-full max-w-[1360px] px-[var(--gutter)] pb-10 pt-[clamp(56px,8vw,112px)]">
        <section id="how-it-works" className="scroll-mt-6">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
            <h2 className="pixel-heading text-[clamp(1.875rem,3.6vw,3rem)]">One question, three phases.</h2>
            <p className="max-w-[32em] text-mute">
              Every run follows a real interview. These panels show an example run, so the numbers
              are made up.
            </p>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-12">
            <Steps className="lg:col-span-5" />
            <ExampleRun className="lg:col-span-7" />
            <BossExample className="lg:col-span-5" />
            <ReportExample className="lg:col-span-7" />
          </div>
        </section>

        <About />
        <FAQ />

        <section className="flex flex-col items-start gap-4 pb-6 pt-[clamp(56px,8vw,112px)]">
          <h2 className="pixel-heading text-[clamp(1.875rem,3.6vw,3rem)]">Ready when you are.</h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <StartLink size="lg">
              <span className="tri" aria-hidden="true" />
              Press Start
            </StartLink>
            <span className="free-chip notch">Free. No card.</span>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-[1360px] flex-wrap justify-between gap-5 px-[var(--gutter)] pb-14 pt-9 text-mute">
        <span>
          <b className="font-display font-bold tracking-[0.04em] text-paper">Codrill</b>
          &nbsp; Made by Bryan. Free to use.
        </span>
        <a href={SUPPORT_URL} className="underline decoration-2 underline-offset-4 hover:text-amber" rel="noopener">
          Support
        </a>
      </footer>
    </div>
  );
}
