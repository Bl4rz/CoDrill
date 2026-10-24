import { TitleScreen } from "@/components/landing/TitleScreen";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Example } from "@/components/landing/Example";
import { About } from "@/components/landing/About";
import { FAQ } from "@/components/landing/FAQ";
import { StartLink } from "@/components/landing/StartLink";
import { ArrowIcon } from "@/components/pixel/icons";
import { SUPPORT_URL } from "@/lib/site";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col overflow-x-clip">
      <TitleScreen />
      <HowItWorks />
      <Example />
      <About />
      <FAQ />

      <section className="flex flex-col items-center gap-4 px-6 pb-24 pt-10 text-center">
        <StartLink size="lg">
          <span className="blink-cursor">
            <ArrowIcon unit="4px" />
          </span>
          Press start
        </StartLink>
        <p className="font-display text-sm uppercase tracking-widest text-green">Free. No card.</p>
      </section>

      <footer className="flex flex-col items-center gap-2 border-t-[3px] border-paper px-6 py-6 text-center text-sm">
        <p>Made by Bryan. Free to use.</p>
        <a
          href={SUPPORT_URL}
          className="underline decoration-2 underline-offset-4 hover:text-amber"
          rel="noopener"
        >
          Support
        </a>
      </footer>
    </main>
  );
}
