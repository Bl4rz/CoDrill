import { TitleScreen } from "@/components/landing/TitleScreen";
import { FAQ } from "@/components/landing/FAQ";

const STEPS = [
  { n: "1", title: "Paste the posting", detail: "A link or the raw text." },
  { n: "2", title: "Answer the questions", detail: "Explain first, then code, then take follow-ups." },
  { n: "3", title: "Read your report", detail: "Scores plus the habits that kept showing up." },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col overflow-x-clip">
      <TitleScreen />

      <section id="how-it-works" className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="pixel-panel border-paper bg-ink p-5">
              <p className="text-amber">STAGE {step.n}</p>
              <h3 className="mt-2 text-lg font-medium">{step.title}</h3>
              <p className="mt-1 text-base leading-relaxed">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-6 py-12">
        <FAQ />
      </section>

      <footer className="px-6 py-8 text-center text-sm">Made by Bryan. Free to use.</footer>
    </main>
  );
}
