import type { Metadata } from "next";
import { PixelLink } from "@/components/pixel/PixelButton";

export const metadata: Metadata = {
  title: "Sign-in error",
  robots: { index: false, follow: false },
};

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="pixel-heading text-2xl">Sign-in didn&apos;t go through</h1>
      <p className="text-base">Something went wrong finishing sign-in with Google. Give it another try.</p>
      <PixelLink href="/">Back to the title screen</PixelLink>
    </main>
  );
}
