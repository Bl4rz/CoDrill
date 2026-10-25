"use client";

import { useParams } from "next/navigation";
import { AdventureRunner } from "@/components/adventure/AdventureRunner";

export default function PlayPage() {
  const params = useParams<{ attemptId: string }>();
  return <AdventureRunner attemptId={params.attemptId} />;
}
