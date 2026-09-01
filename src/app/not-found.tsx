import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo className="h-10 w-10" />
      <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
      <p className="text-sm text-muted">
        Whatever you were looking for isn&apos;t here — it may have moved, or the link might be
        off.
      </p>
      <div className="flex items-center gap-4 pt-2 text-sm">
        <Link href="/" className="text-accent-green hover:underline">
          ← Back to home
        </Link>
        <Link href="/start" className="text-accent-amber hover:underline">
          Start a mock interview
        </Link>
      </div>
    </main>
  );
}
