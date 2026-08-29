"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { motion } from "motion/react";
import { TypedTerminal } from "@/components/landing/TypedTerminal";
import { CodeFollowupPreview } from "@/components/landing/CodeFollowupPreview";
import { ReportPreview } from "@/components/landing/ReportPreview";
import { ExampleWalkthrough } from "@/components/landing/ExampleWalkthrough";
import { FAQ } from "@/components/landing/FAQ";
import { FlowingThreads } from "@/components/landing/FlowingThreads";
import { Logo } from "@/components/Logo";
import { AuthButton } from "@/components/AuthButton";

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

const FEATURES = [
  {
    title: "Freshly generated, every time",
    detail:
      "No question banks, no LeetCode reskins. The model reads your posting and invents 5-8 original questions tailored to the exact role.",
    accent: "var(--accent-green)",
  },
  {
    title: "Approach before code",
    detail:
      "A real interviewer doesn't hand you a blank editor. You explain your plan first — flawed reasoning gets a guiding question, not a lecture.",
    accent: "var(--accent-amber)",
  },
  {
    title: "A real code editor",
    detail: "Monaco, the engine behind VS Code. JavaScript, Python, and Java, syntax-highlighted.",
    accent: "var(--accent-green)",
  },
  {
    title: "Follow-ups that read your code",
    detail:
      "Complexity, scaling, edge cases — asked about the specific function you just wrote, not a generic checklist.",
    accent: "var(--accent-amber)",
  },
  {
    title: "Speak it, don't type it",
    detail:
      "Talk through your approach out loud and hear the interviewer respond, with a genuinely human-sounding voice.",
    accent: "var(--accent-green)",
  },
  {
    title: "A report that finds patterns",
    detail:
      "Not just per-question scores — it flags habits repeated across the session, like skipping complexity until asked.",
    accent: "var(--accent-amber)",
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

      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted">Codrill</span>
        </div>
        <div className="flex items-center gap-3">
          <AuthButton />
          <Link
            href="/start"
            className="rounded-md bg-accent-amber px-4 py-2 text-xs font-semibold text-background transition hover:scale-[1.04] hover:bg-accent-amber-soft active:scale-[0.97]"
          >
            Start free session
          </Link>
        </div>
      </nav>

      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pb-20 pt-16 text-center sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-accent-amber/30 bg-surface-glass px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent-amber shadow-[0_0_8px_1px_var(--accent-amber)]" />
          First session free — no signup
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl"
        >
          Practice the interview{" "}
          <span className="text-gradient-brand">for the job you actually want.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
        >
          Paste a job posting. Get original coding questions built for that exact role, then run
          through a real interview — approach, code, follow-ups — with an AI interviewer that
          scores how you think, not just whether the code runs.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="flex flex-col items-center gap-3 pt-2 sm:flex-row"
        >
          <Link
            href="/start"
            className="rounded-md bg-[linear-gradient(100deg,var(--accent-green)_0%,var(--accent-amber)_100%)] px-6 py-3 text-sm font-semibold text-background shadow-[0_0_40px_-10px_var(--accent-green)] transition hover:scale-[1.03] hover:shadow-[0_0_50px_-8px_var(--accent-amber)] active:scale-[0.97]"
          >
            Start your free mock interview →
          </Link>
          <span className="text-xs text-muted">Takes about 20 minutes per question</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-10 w-full max-w-2xl"
        >
          <TypedTerminal lines={APPROACH_LINES} label="interviewer.speaking()" />
        </motion.div>
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
            <p className={`font-mono text-3xl font-semibold sm:text-4xl ${s.color}`}>{s.value}</p>
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
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
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
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto w-full max-w-5xl px-6 py-20"
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
              className="card-glass rounded-lg border border-border p-6 transition-shadow hover:shadow-[0_0_40px_-18px_var(--step-accent)]"
              style={{ "--step-accent": step.accent } as CSSProperties}
            >
              <span className="font-mono text-2xl font-semibold" style={{ color: step.accent }}>
                {step.n}
              </span>
              <h3 className="mt-3 text-base font-medium text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.detail}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto w-full max-w-5xl px-6 py-20"
      >
        <motion.h2
          variants={fadeUp}
          className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Not another question bank.
        </motion.h2>
        <motion.p variants={fadeUp} className="mx-auto mt-3 max-w-xl text-center text-sm text-muted">
          Every part of the flow is built to feel like an actual interview, not a coding quiz.
        </motion.p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="card-glass rounded-lg border border-border p-5 transition-shadow hover:shadow-[0_0_44px_-18px_var(--feature-accent)]"
              style={
                {
                  borderTopColor: f.accent,
                  borderTopWidth: 2,
                  "--feature-accent": f.accent,
                } as CSSProperties
              }
            >
              <h3 className="text-sm font-medium text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.detail}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto w-full max-w-3xl px-6 py-20"
      >
        <motion.p
          variants={fadeUp}
          className="mb-8 text-center font-mono text-xs uppercase tracking-widest text-muted"
        >
          Pricing
        </motion.p>
        <motion.div
          variants={fadeUp}
          className="card-glass flex flex-col gap-6 rounded-lg border border-border p-8 shadow-[0_0_50px_-20px_var(--accent-green)] sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-lg font-medium text-accent-green">First session: free</p>
            <p className="mt-1 text-sm text-muted">
              Full flow, every question, the whole report. No card, no signup.
            </p>
          </div>
          <div className="h-px w-full bg-border sm:h-12 sm:w-px" />
          <div>
            <p className="text-lg font-medium text-accent-amber">
              $12 <span className="text-sm font-normal text-muted">per session after</span>
            </p>
            <p className="mt-1 text-sm text-muted">One new job posting, one new set of questions.</p>
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="mx-auto w-full max-w-3xl px-6 py-20"
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
        <motion.h2 variants={fadeUp} className="text-2xl font-semibold text-foreground sm:text-3xl">
          Your next interview is coming. Practice the one that matters.
        </motion.h2>
        <motion.div variants={fadeUp}>
          <Link
            href="/start"
            className="inline-block rounded-md bg-[linear-gradient(100deg,var(--accent-green)_0%,var(--accent-amber)_100%)] px-6 py-3 text-sm font-semibold text-background shadow-[0_0_40px_-10px_var(--accent-amber)] transition hover:scale-[1.03] hover:shadow-[0_0_50px_-8px_var(--accent-green)] active:scale-[0.97]"
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
