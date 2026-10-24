"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * null until we know, then true/false. Only used to choose where a button goes
 * (the Hub for signed-in players); anything that matters is checked on the server.
 */
export function useIsSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Supabase unconfigured is known synchronously
      setSignedIn(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => subscription.unsubscribe();
  }, []);

  return signedIn;
}
