"use client";

import { useParams } from "next/navigation";
import { SessionShell } from "@/components/SessionShell";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  return <SessionShell sessionId={params.id} />;
}
