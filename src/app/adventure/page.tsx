"use client";

import { AppHeader } from "@/components/AppHeader";
import { AdventureMap } from "@/components/adventure/AdventureMap";
import { SkeletonPanel } from "@/components/hub/Skeleton";
import { StatusMessage } from "@/components/hub/StatusMessage";
import { PixelButton, PixelLink } from "@/components/pixel/PixelButton";
import { signInWithGoogle } from "@/lib/auth";
import { useAdventure } from "@/lib/useAdventure";

const CRUMBS = [{ label: "Home", href: "/" }, { label: "Adventure" }];

export default function AdventurePage() {
  const { state, setState, reload } = useAdventure();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-8 sm:py-12">
      <AppHeader crumbs={CRUMBS} />

      {state.status === "loading" && (
        <div className="flex flex-col gap-6" role="status" aria-label="Loading the map">
          <SkeletonPanel lines={2} />
          <SkeletonPanel lines={5} />
        </div>
      )}

      {state.status === "signed_out" && (
        <StatusMessage title="Sign in to play" action={<PixelButton onClick={() => signInWithGoogle()}>Sign in with Google</PixelButton>}>
          Adventure saves your progress to your account, so you need to be signed in.
        </StatusMessage>
      )}

      {state.status === "unavailable" && (
        <StatusMessage title="Adventure is offline" action={<PixelLink href="/start">Start a normal run</PixelLink>}>
          Progress tracking isn&apos;t set up on this server yet, so levels can&apos;t be saved.
        </StatusMessage>
      )}

      {state.status === "error" && (
        <StatusMessage
          title="Couldn't load"
          action={
            <PixelButton
              onClick={() => {
                setState({ status: "loading" });
                void reload();
              }}
            >
              Try again
            </PixelButton>
          }
        >
          {state.message}
        </StatusMessage>
      )}

      {state.status === "ready" && (
        <>
          <header className="flex flex-col gap-3">
            <p className="font-display text-sm uppercase tracking-widest text-green">
              {state.data.completed_count}/{state.data.total_count} cleared
            </p>
            <h1 className="pixel-heading text-3xl sm:text-4xl">{state.data.world.title}</h1>
            <p className="max-w-xl text-base leading-relaxed">{state.data.world.blurb}</p>
          </header>

          <AdventureMap data={state.data} />

          <p className="border-[3px] border-dashed border-paper p-4 text-center font-display text-sm uppercase tracking-widest">
            More worlds coming
          </p>
        </>
      )}
    </main>
  );
}
