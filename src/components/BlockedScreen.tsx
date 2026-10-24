"use client";

import { useEffect, useState } from "react";
import { BLOCKED_EVENT, type BlockedDetail } from "@/lib/api-client";
import { Mascot } from "@/components/pixel/Mascot";
import { PixelButton, PixelLink } from "@/components/pixel/PixelButton";

/**
 * Full-screen message shown when an API call comes back "site is at its daily
 * cap" or "you've used today's runs". Mounted once in the root layout and
 * triggered from postJson, so no screen needs its own handling.
 */
export function BlockedScreen() {
  const [block, setBlock] = useState<BlockedDetail | null>(null);

  useEffect(() => {
    const onBlocked = (e: Event) => setBlock((e as CustomEvent<BlockedDetail>).detail);
    window.addEventListener(BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(BLOCKED_EVENT, onBlocked);
  }, []);

  if (!block) return null;
  const capacity = block.reason === "capacity";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="blocked-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink p-6"
    >
      <div className="px-dialog flex w-full max-w-md flex-col items-center gap-5 p-8 text-center">
        <div className="mascot-idle">
          <Mascot expression={capacity ? "concerned" : "thinking"} scale={1.5} />
        </div>
        <h2 id="blocked-title" className="pixel-heading text-2xl">
          {capacity ? "Server needs a break." : "That's all for today."}
        </h2>
        <p className="text-lg leading-relaxed">
          {capacity ? "Come back tomorrow." : block.message}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <PixelLink href="/">Back to start</PixelLink>
          <PixelButton variant="ghost" onClick={() => setBlock(null)}>
            Close
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
