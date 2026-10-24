"use client";

import { useCallback, useEffect, useState } from "react";
import type { HubResponse } from "@/lib/progression/types";

export type PlayerState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "unavailable" }
  | { status: "error"; message: string }
  | { status: "ready"; data: HubResponse };

/**
 * Loads the signed-in player's hub data from /api/player. The server decides
 * everything shown; this only reads. On first load it also tells the server the
 * browser's time zone once, so daily quests reset at the player's own midnight.
 */
export function usePlayer() {
  const [state, setState] = useState<PlayerState>({ status: "loading" });

  const load = useCallback(async (): Promise<HubResponse | null> => {
    try {
      const res = await fetch("/api/player");
      if (res.status === 401) {
        setState({ status: "signed_out" });
        return null;
      }
      const body = await res.json().catch(() => ({}));
      if (res.status === 503 && body.reason === "progression_unavailable") {
        setState({ status: "unavailable" });
        return null;
      }
      if (!res.ok) {
        setState({ status: "error", message: body.error || "Couldn't load your progress." });
        return null;
      }
      setState({ status: "ready", data: body as HubResponse });
      return body as HubResponse;
    } catch {
      setState({ status: "error", message: "Couldn't reach the server. Check your connection." });
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const first = await load();
      if (cancelled || !first) return;
      let browserTz: string | undefined;
      try {
        browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {
        return;
      }
      if (!browserTz || browserTz === first.timezone) return;
      const res = await fetch("/api/player/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: browserTz }),
      }).catch(() => null);
      const body = res && res.ok ? await res.json().catch(() => null) : null;
      if (!cancelled && body?.changed) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { state, setState, reload: load };
}
