import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Mascot } from "@/components/pixel/Mascot";
import { FAQ } from "@/components/landing/FAQ";

const STEPS = [
  { n: "1", title: "Paste the posting", detail: "A link or the raw text." },
  { n: "2", title: "Answer the questions", detail: "Explain first, then code, then take follow-ups." },
  { n: "3", title: "Read your report", detail: "Scores plus the habits that kept showing up." },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col overflow-x-hidden">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-base uppercase tracking-widest">Codrill</span>
        </div>
        <Link href="/start" className="text-sm uppercase tracking-widest text-green">
          Start
        </Link>
      </nav>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
        <Mascot className="mascot-idle" scale={2} />
        <h1 className="pixel-title text-6xl sm:text-7xl">CODRILL</h1>
        <p className="max-w-xl text-lg leading-relaxed">
          Paste a job posting. Get interview questions made for that job. Practice out loud or in
          code.
        </p>
        <Link
          href="/start"
          className="pixel-press border-[3px] border-ink bg-green px-6 py-3 font-display text-xl font-bold text-ink"
        >
          START
        </Link>
      </section>

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
