"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdventureResponse } from "@/lib/adventure/types";

export type AdventureState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "unavailable" }
  | { status: "error"; message: string }
  | { status: "ready"; data: AdventureResponse };

/** Loads the signed-in player's map from /api/adventure. Statuses are decided by the server. */
export function useAdventure() {
  const [state, setState] = useState<AdventureState>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/adventure");
      if (res.status === 401) return setState({ status: "signed_out" });
      const body = await res.json().catch(() => ({}));
      if (res.status === 503 && body.reason === "progression_unavailable") return setState({ status: "unavailable" });
      if (!res.ok) return setState({ status: "error", message: body.error || "Couldn't load the map." });
      setState({ status: "ready", data: body as AdventureResponse });
    } catch {
      setState({ status: "error", message: "Couldn't reach the server. Check your connection." });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
  }, [load]);

  return { state, setState, reload: load };
}
