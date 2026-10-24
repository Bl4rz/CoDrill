import { TitleScreen } from "@/components/landing/TitleScreen";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Example } from "@/components/landing/Example";
import { About } from "@/components/landing/About";
import { FAQ } from "@/components/landing/FAQ";
import { PixelLink } from "@/components/pixel/PixelButton";
import { ArrowIcon } from "@/components/pixel/icons";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col overflow-x-clip">
      <TitleScreen />
      <HowItWorks />
      <Example />
      <About />
      <FAQ />

      <section className="flex flex-col items-center gap-4 px-6 pb-24 pt-10 text-center">
        <PixelLink href="/start" size="lg">
          <span className="blink-cursor">
            <ArrowIcon unit="4px" />
          </span>
          Press start
        </PixelLink>
        <p className="font-display text-sm uppercase tracking-widest text-green">Free. No card.</p>
      </section>

      <footer className="border-t-[3px] border-paper px-6 py-6 text-center text-sm">
        Made by Bryan. Free to use.
      </footer>
    </main>
  );
}
