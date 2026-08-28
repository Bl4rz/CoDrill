"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StoredSession, loadSession } from "@/lib/store";
import { ReportView } from "@/components/ReportView";
import { Spinner } from "@/components/Spinner";

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<StoredSession | null | undefined>(undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading client-only localStorage on mount
    setSession(loadSession(params.id));
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
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-foreground">No report found for this session yet.</p>
        <Link href="/" className="text-sm text-accent-green hover:underline">
          Start a new session
        </Link>
      </div>
    );
  }

  return <ReportView session={session} />;
}
