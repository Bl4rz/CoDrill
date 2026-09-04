"use client";

import Link from "next/link";
import type { CSSProperties, MouseEvent } from "react";
import { motion } from "motion/react";
import { TypedTerminal } from "@/components/landing/TypedTerminal";
import { CodeFollowupPreview } from "@/components/landing/CodeFollowupPreview";
import { ReportPreview } from "@/components/landing/ReportPreview";
import { ExampleWalkthrough } from "@/components/landing/ExampleWalkthrough";
import { FAQ } from "@/components/landing/FAQ";
import { FlowingThreads } from "@/components/landing/FlowingThreads";
import { Logo } from "@/components/Logo";
import { AuthButton } from "@/components/AuthButton";
import { Mascot } from "@/components/Mascot";
import { Starfield } from "@/components/landing/Starfield";

function handleSpotlight(e: MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const HERO_BULLETS = {
  left: ["Freshly generated questions, every session", "A real code editor — Monaco, syntax-highlighted"],
  right: ["Guiding questions before you write code", "A report that finds patterns, not just scores"],
};

const FEATURES = [
  {
    title: "Freshly generated, every time",
    detail:
      "No question banks, no LeetCode reskins. The model reads your posting and invents 5-8 original questions tailored to the exact role — every session is a different set.",
    accent: "var(--accent-green)",
    span: "lg:col-span-2 lg:row-span-2",
    big: true,
  },
  {
    title: "Approach before code",
    detail:
      "A real interviewer doesn't hand you a blank editor. You explain your plan first — flawed reasoning gets a guiding question, not a lecture.",
    accent: "var(--accent-amber)",
    span: "lg:col-span-2",
  },
  {
    title: "A real code editor",
    detail: "Monaco, the engine behind VS Code. JavaScript, Python, and Java, syntax-highlighted.",
    accent: "var(--accent-green)",
    span: "",
  },
  {
    title: "Follow-ups that read your code",
    detail:
      "Complexity, scaling, edge cases — asked about the specific function you just wrote, not a generic checklist.",
    accent: "var(--accent-amber)",
    span: "",
  },
  {
    title: "Speak it, don't type it",
    detail:
      "Talk through your approach out loud and hear the interviewer respond, with a genuinely human-sounding voice.",
    accent: "var(--accent-green)",
    span: "lg:col-span-2",
  },
  {
    title: "A report that finds patterns",
    detail:
      "Not just per-question scores — it flags habits repeated across the session, like skipping complexity until asked.",
    accent: "var(--accent-amber)",
    span: "lg:col-span-2",
  },
];

const APPROACH_LINES = [
  {
    speaker: "interviewer" as const,
    text: "Before you write any code, walk me through how you'd approach this.",
  },
  {
    speaker: "you" as const,
    text: "I'll use a hash map to track counts as I scan once, left to right...",
  },
  { speaker: "interviewer" as const, text: "What happens if two entries hash to the same bucket?" },
];

const MOMENTS = [
  {
    tag: "Approach first",
    title: "It catches the gap before you've written a line of code.",
    detail:
      "State your plan out loud or in writing. A real flaw gets a guiding question back — never the answer handed to you.",
  },
  {
    tag: "Code + follow-ups",
    title: "Follow-ups about the code you actually wrote.",
    detail:
      "Not a generic checklist. The question references your specific function, your specific choices.",
  },
  {
    tag: "Session report",
    title: "Scored on how you think, not just pass/fail.",
    detail:
      "Three independent scores per question, plus patterns that only show up across the whole session.",
  },
];

const STATS = [
  { value: "5-8", label: "Original questions generated per session", color: "text-accent-green" },
  {
    value: "3",
    label: "Independent scores per question — correctness, communication, reasoning",
    color: "text-accent-amber",
  },
  { value: "3", label: "Languages supported — JavaScript, Python, Java", color: "text-accent-green" },
];

const STEPS = [
  {
    n: "01",
    title: "Paste the posting",
    detail: "A URL or the raw text. We extract the tech stack, seniority, and focus areas.",
    accent: "var(--accent-green)",
  },
  {
    n: "02",
    title: "Get your questions",
    detail: "5-8 original questions, a genuine mix of difficulty, built specifically for that role.",
    accent: "var(--accent-amber)",
  },
  {
    n: "03",
    title: "Run the interview",
    detail: "Approach, code, follow-ups, scored — question after question, like the real thing.",
    accent: "var(--accent-green)",
  },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
        <FlowingThreads />
      </div>

      <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-6">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted">Codrill</span>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <AuthButton />
          <Link
            href="/start"
            className="pixel-press border-2 border-background/40 bg-accent-amber px-4 py-2 text-xs font-semibold text-background"
            style={{ "--pixel-shadow": "rgba(0,0,0,0.5)" } as CSSProperties}
          >
            Start free session
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-6 overflow-hidden px-6 pb-16 pt-14 text-center sm:pt-20">
        <Starfield className="opacity-70" />

        <div className="relative flex w-full flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-4">
          <motion.ul
            initial="hidden"
            animate="show"
            variants={stagger}
            className="hidden shrink-0 flex-col gap-5 lg:flex lg:w-56"
          >
            {HERO_BULLETS.left.map((b) => (
              <motion.li key={b} variants={fadeUp} className="flex items-start gap-2 text-left">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-accent-green shadow-[0_0_6px_1px_var(--accent-green)]" />
                <span className="text-xs leading-relaxed text-muted">{b}</span>
              </motion.li>
            ))}
          </motion.ul>

          <div className="relative flex flex-1 flex-col items-center gap-6">
            <div
              className="pointer-events-none absolute left-1/2 top-8 -z-10 h-64 w-64 -translate-x-1/2 rounded-full opacity-60 blur-3xl sm:h-80 sm:w-80"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--accent-green) 55%, transparent) 0%, color-mix(in srgb, var(--accent-amber) 30%, transparent) 45%, transparent 75%)",
              }}
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Mascot className="mascot-idle h-20 w-20 sm:h-28 sm:w-28" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              aria-hidden="true"
              className="select-none font-pixel text-2xl leading-none tracking-tight text-foreground sm:text-4xl"
            >
              C<span className="text-accent-green">O</span>DRILL
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="pixel-panel inline-flex items-center gap-2 border-accent-amber/60 bg-surface-glass px-3 py-1.5 font-pixel text-[9px] uppercase tracking-wider text-accent-amber backdrop-blur"
              style={{ "--pixel-shadow": "var(--accent-amber)" } as CSSProperties}
            >
              <span className="h-1.5 w-1.5 bg-accent-amber shadow-[0_0_8px_1px_var(--accent-amber)]" />
              First session free — no signup
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-display text-3xl font-medium tracking-tight text-foreground italic sm:text-5xl"
            >
              Practice the interview for the job{" "}
              <span className="text-accent-green not-italic">you actually want</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
            >
              Paste a job posting. Get original coding questions built for that exact role, then
              run through a real interview — approach, code, follow-ups — with an AI interviewer
              that scores how you think, not just whether the code runs.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col items-center gap-3 pt-2 sm:flex-row"
            >
              <Link
                href="/start"
                className="pixel-press border-2 border-background/40 bg-[linear-gradient(100deg,var(--accent-green)_0%,var(--accent-amber)_100%)] px-6 py-3 text-sm font-semibold text-background"
                style={{ "--pixel-shadow": "rgba(0,0,0,0.55)" } as CSSProperties}
              >
                Start your free mock interview →
              </Link>
              <span className="text-xs text-muted">Takes about 20 minutes per question</span>
            </motion.div>
          </div>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={stagger}
            className="hidden shrink-0 flex-col gap-5 lg:flex lg:w-56"
          >
            {HERO_BULLETS.right.map((b) => (
              <motion.li key={b} variants={fadeUp} className="flex items-start gap-2 text-left">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-accent-amber shadow-[0_0_6px_1px_var(--accent-amber)]" />
                <span className="text-xs leading-relaxed text-muted">{b}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="pixel-panel relative mt-6 w-full max-w-2xl border-border bg-surface-glass p-3 backdrop-blur"
          style={{ "--pixel-shadow": "rgba(0,0,0,0.5)" } as CSSProperties}
        >
          <p className="mb-2 flex items-center gap-1.5 font-pixel text-[8px] uppercase tracking-widest text-muted">
            <span className="h-1.5 w-1.5 bg-accent-green" />
            Live preview
          </p>
          <TypedTerminal lines={APPROACH_LINES} label="interviewer.speaking()" />
        </motion.div>

        <motion.a
          href="#how-it-works"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          aria-label="Scroll to how it works"
          className="pixel-dot mt-6 inline-block h-2.5 w-2.5 bg-muted"
        />
      </section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 pb-16"
      >
        <motion.p
          variants={fadeUp}
          className="text-center font-mono text-xs uppercase tracking-widest text-muted"
        >
          One real example, before you start
        </motion.p>
        <motion.div variants={fadeUp}>
          <ExampleWalkthrough />
        </motion.div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto flex w-full max-w-3xl items-center justify-center gap-10 px-6 py-10 sm:gap-16"
      >
        {STATS.map((s) => (
          <motion.div key={s.label} variants={fadeUp} className="max-w-[180px] text-center">
            <p className={`font-pixel text-xl sm:text-2xl ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs leading-snug text-muted">{s.label}</p>
          </motion.div>
        ))}
      </motion.section>

      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="h-px w-full bg-border-subtle" />
      </div>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto flex w-full max-w-5xl flex-col gap-24 px-6 py-24"
      >
        <motion.div variants={fadeUp} className="text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">See it in action</p>
          <h2 className="font-display mt-3 text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            Every screenshot below is the real product.
          </h2>
        </motion.div>

        <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-12">
          <motion.div variants={fadeUp} className="flex-1 sm:order-1">
            <p className="font-mono text-xs uppercase tracking-wider text-accent-green">
              {MOMENTS[0].tag}
            </p>
            <h3 className="mt-2 text-xl font-medium text-foreground">{MOMENTS[0].title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{MOMENTS[0].detail}</p>
          </motion.div>
          <motion.div variants={fadeUp} className="w-full flex-1 sm:order-2">
            <TypedTerminal lines={APPROACH_LINES} label="approach.ts" />
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-8 sm:flex-row-reverse sm:gap-12">
          <motion.div variants={fadeUp} className="flex-1">
            <p className="font-mono text-xs uppercase tracking-wider text-accent-amber">
              {MOMENTS[1].tag}
            </p>
            <h3 className="mt-2 text-xl font-medium text-foreground">{MOMENTS[1].title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{MOMENTS[1].detail}</p>
          </motion.div>
          <motion.div variants={fadeUp} className="w-full flex-1">
            <CodeFollowupPreview />
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-12">
          <motion.div variants={fadeUp} className="flex-1 sm:order-1">
            <p className="font-mono text-xs uppercase tracking-wider text-accent-green">
              {MOMENTS[2].tag}
            </p>
            <h3 className="mt-2 text-xl font-medium text-foreground">{MOMENTS[2].title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{MOMENTS[2].detail}</p>
          </motion.div>
          <motion.div variants={fadeUp} className="w-full flex-1 sm:order-2">
            <ReportPreview />
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        id="how-it-works"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 py-20"
      >
        <motion.p
          variants={fadeUp}
          className="mb-10 text-center font-mono text-xs uppercase tracking-widest text-muted"
        >
          How it works
        </motion.p>
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <motion.div
              key={step.n}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onMouseMove={handleSpotlight}
              className="card-glass spotlight-card pixel-panel p-6 transition-shadow hover:shadow-[inset_0_1px_0_0_var(--step-accent),0_8px_24px_-16px_var(--step-accent)]"
              style={
                {
                  "--step-accent": step.accent,
                  "--spot-color": step.accent,
                  borderColor: `color-mix(in srgb, ${step.accent} 45%, transparent)`,
                  "--pixel-shadow": step.accent,
                } as CSSProperties
              }
            >
              <span className="font-pixel text-lg" style={{ color: step.accent }}>
                {step.n}
              </span>
              <h3 className="mt-3 text-base font-medium text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.detail}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        id="features"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 py-20"
      >
        <motion.h2
          variants={fadeUp}
          className="font-display text-center text-2xl font-medium tracking-tight text-foreground sm:text-3xl"
        >
          Not another question bank.
        </motion.h2>
        <motion.p variants={fadeUp} className="mx-auto mt-3 max-w-xl text-center text-sm text-muted">
          Every part of the flow is built to feel like an actual interview, not a coding quiz.
        </motion.p>

        <div className="mt-12 grid auto-rows-[minmax(9rem,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-flow-dense lg:grid-cols-4">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onMouseMove={handleSpotlight}
              className={`card-glass spotlight-card flex flex-col justify-center rounded-lg border border-border p-5 transition-shadow hover:shadow-[inset_0_1px_0_0_var(--feature-accent),0_8px_24px_-16px_var(--feature-accent)] ${f.span}`}
              style={
                {
                  borderTopColor: f.accent,
                  borderTopWidth: 2,
                  "--feature-accent": f.accent,
                  "--spot-color": f.accent,
                } as CSSProperties
              }
            >
              <h3 className={f.big ? "font-display text-xl font-medium text-foreground" : "text-sm font-medium text-foreground"}>
                {f.title}
              </h3>
              <p className={f.big ? "mt-3 max-w-md text-sm leading-relaxed text-muted" : "mt-2 text-sm leading-relaxed text-muted"}>
                {f.detail}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        id="pricing"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto w-full max-w-3xl scroll-mt-20 px-6 py-20"
      >
        <motion.p
          variants={fadeUp}
          className="mb-8 text-center font-mono text-xs uppercase tracking-widest text-muted"
        >
          Pricing
        </motion.p>
        <motion.div
          variants={fadeUp}
          onMouseMove={handleSpotlight}
          className="card-glass spotlight-card pixel-panel flex flex-col gap-6 border-accent-green/50 p-8 sm:flex-row sm:items-center sm:justify-between"
          style={{ "--spot-color": "var(--accent-amber)", "--pixel-shadow": "var(--accent-green)" } as CSSProperties}
        >
          <div>
            <p className="font-pixel text-sm text-accent-green">FREE</p>
            <p className="mt-2 text-sm text-muted">
              Full flow, every question, the whole report. No card, no signup.
            </p>
          </div>
          <div className="h-px w-full bg-border sm:h-12 sm:w-px" />
          <div>
            <p className="flex items-baseline gap-2 font-pixel text-sm text-accent-amber">
              $12 <span className="font-sans text-sm font-normal text-muted">per session after</span>
            </p>
            <p className="mt-2 text-sm text-muted">One new job posting, one new set of questions.</p>
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        id="faq"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto w-full max-w-3xl scroll-mt-20 px-6 py-20"
      >
        <motion.p
          variants={fadeUp}
          className="mb-8 text-center font-mono text-xs uppercase tracking-widest text-muted"
        >
          FAQ
        </motion.p>
        <motion.div variants={fadeUp}>
          <FAQ />
        </motion.div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 pb-28 pt-8 text-center"
      >
        <motion.h2
          variants={fadeUp}
          className="font-display text-2xl font-medium text-foreground sm:text-3xl"
        >
          Your next interview is coming. Practice the one that matters.
        </motion.h2>
        <motion.div variants={fadeUp}>
          <Link
            href="/start"
            className="pixel-press inline-block border-2 border-background/40 bg-[linear-gradient(100deg,var(--accent-green)_0%,var(--accent-amber)_100%)] px-6 py-3 text-sm font-semibold text-background"
            style={{ "--pixel-shadow": "rgba(0,0,0,0.55)" } as CSSProperties}
          >
            Start your free mock interview →
          </Link>
        </motion.div>
      </motion.section>

      <footer className="border-t border-border-subtle px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 text-xs text-muted sm:flex-row">
          <span>Codrill</span>
          <span>Built for engineers, by engineers.</span>
        </div>
      </footer>
    </main>
  );
}
