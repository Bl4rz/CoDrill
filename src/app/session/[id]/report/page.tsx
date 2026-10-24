"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StoredSession, loadSession } from "@/lib/store";
import { fetchCloudSession } from "@/lib/supabase/sessions";
import { ReportView } from "@/components/ReportView";
import { PixelLink } from "@/components/pixel/PixelButton";
import { Spinner } from "@/components/Spinner";

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<StoredSession | null | undefined>(undefined);

  useEffect(() => {
    const local = loadSession(params.id);
    if (local) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading client-only localStorage on mount
      setSession(local);
      return;
    }
    // Not on this device — fall back to the cloud copy (e.g. viewing from a
    // different device than the one the session was run on).
    let cancelled = false;
    fetchCloudSession(params.id).then((cloud) => {
      if (!cancelled) setSession(cloud);
    });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (session === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner label="Loading report" />
      </div>
    );
  }

  if (session === null || !session.report) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="font-display text-xl uppercase tracking-widest">No report yet</p>
        <p className="text-base">This run doesn&apos;t have a report saved.</p>
        <PixelLink href="/start">Start a new quest</PixelLink>
      </div>
    );
  }

  return <ReportView session={session} />;
}
