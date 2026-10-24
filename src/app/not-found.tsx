import type { Metadata } from "next";
import { Mascot } from "@/components/pixel/Mascot";
import { PixelLink } from "@/components/pixel/PixelButton";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="mascot-idle">
        <Mascot expression="concerned" scale={1.5} />
      </div>
      <h1 className="pixel-title text-[clamp(1.5rem,8vw,3.25rem)]">GAME OVER?</h1>
      <p className="pixel-heading text-3xl">Not yet.</p>
      <p className="max-w-sm text-base leading-relaxed">
        That page doesn&apos;t exist. It may have moved, or the link is off.
      </p>
      <div className="flex flex-wrap justify-center gap-4 pt-2">
        <PixelLink href="/">Back to start</PixelLink>
        <PixelLink href="/start" variant="ghost">
          Select a quest
        </PixelLink>
      </div>
    </main>
  );
}
