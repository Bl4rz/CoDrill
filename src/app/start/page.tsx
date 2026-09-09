"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { JobPostingForm } from "@/components/JobPostingForm";
import { RoleSummaryConfirm } from "@/components/RoleSummaryConfirm";
import { Spinner } from "@/components/Spinner";
import { InterviewQuestion, RoleSummary } from "@/lib/types";
import { createSession } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { AuthButton } from "@/components/AuthButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const PENDING_KEY = "codrill:pending-checkout";

interface Pending {
  jobPostingText: string;
  summary: RoleSummary;
}

interface GenerateQuestionsResponse {
  questions: InterviewQuestion[];
  error?: string;
  reason?: string;
}

interface CheckoutResponse {
  url?: string;
  error?: string;
}

async function postJson<T>(url: string, body: unknown): Promise<{ data: T; res: Response }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { data, res };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function StartPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"input" | "confirm">("input");
  const [jobPostingText, setJobPostingText] = useState("");
  const [summary, setSummary] = useState<RoleSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelledNotice, setCancelledNotice] = useState(false);
  const resumedRef = useRef(false);

  async function generateAndContinue(text: string, finalSummary: RoleSummary) {
    setGenerating(true);
    setError(null);
    try {
      const { data, res } = await postJson<GenerateQuestionsResponse>("/api/generate-questions", {
        role_summary: finalSummary,
      });

      if (res.status === 402) {
        // Stash what they've already done so returning from checkout can
        // pick up right where this left off, instead of re-typing the
        // posting or re-confirming the extracted role.
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ jobPostingText: text, summary: finalSummary }));
        const checkout = await postJson<CheckoutResponse>("/api/billing/create-checkout-session", {
          next: "/start",
        });
        if (!checkout.res.ok || !checkout.data.url) {
          throw new Error(checkout.data.error || "Couldn't start checkout.");
        }
        window.location.href = checkout.data.url;
        return;
      }

      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      const session = createSession(text, finalSummary, data.questions);
      router.push(`/session/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setGenerating(false);
    }
  }

  // Returning from Stripe Checkout: restore the posting/role summary that
  // were stashed before the redirect and pick the flow back up. A credit
  // created by the webhook can lag the redirect back by a second or two, so
  // this retries a few times before giving up rather than failing on the
  // very first attempt.
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    if (!checkoutStatus) return;

    window.history.replaceState(null, "", "/start");

    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    const pending = JSON.parse(raw) as Pending;

    if (checkoutStatus === "cancelled") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring state from a client-only query param/sessionStorage read on mount
      setJobPostingText(pending.jobPostingText);
      setSummary(pending.summary);
      setStage("confirm");
      setCancelledNotice(true);
      return;
    }

    if (checkoutStatus === "success") {
      setJobPostingText(pending.jobPostingText);
      setSummary(pending.summary);
      setStage("confirm");
      (async () => {
        for (let attempt = 0; attempt < 4; attempt++) {
          if (attempt > 0) await sleep(1500);
          setError(null);
          setGenerating(true);
          const { data, res } = await postJson<GenerateQuestionsResponse>("/api/generate-questions", {
            role_summary: pending.summary,
          });
          if (res.status === 402) continue; // webhook hasn't landed yet — retry
          setGenerating(false);
          if (!res.ok) {
            setError(data.error || "Something went wrong.");
            return;
          }
          sessionStorage.removeItem(PENDING_KEY);
          const session = createSession(pending.jobPostingText, pending.summary, data.questions);
          router.push(`/session/${session.id}`);
          return;
        }
        setError(
          "Payment succeeded, but we're still waiting on confirmation — refresh this page in a few seconds to try again.",
        );
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <Logo className="h-6 w-6" />
            <span className="font-mono text-xs uppercase tracking-widest text-muted">
              Codrill
            </span>
          </Link>
          <AuthButton />
        </div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Start" }]} />
        <h1 className="font-display text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          Paste the job posting you&apos;re preparing for.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          We&apos;ll extract the role, generate tailored questions, and start your mock interview.
        </p>
      </header>

      <div className="rounded-lg border border-border-subtle bg-surface-raised/40 p-px">
        <div className="rounded-[7px] bg-background p-6">
          {stage === "input" && (
            <JobPostingForm
              onExtracted={(text, extractedSummary) => {
                setJobPostingText(text);
                setSummary(extractedSummary);
                setStage("confirm");
              }}
            />
          )}

          {stage === "confirm" && summary && (
            <RoleSummaryConfirm
              summary={summary}
              onBack={() => setStage("input")}
              onConfirm={(finalSummary) => generateAndContinue(jobPostingText, finalSummary)}
            />
          )}

          {cancelledNotice && (
            <p className="mt-4 text-sm text-muted">
              Checkout was cancelled — no charge was made. Pick up where you left off whenever you&apos;re ready.
            </p>
          )}
          {error && <p className="mt-4 text-sm text-accent-red">{error}</p>}
          {generating && (
            <div className="mt-4">
              <Spinner label="Generating your interview questions" />
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted">
        Your first mock interview session is free, start to finish — no signup required.
      </p>
    </main>
  );
}
