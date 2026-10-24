"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT, type ToastInput } from "@/lib/toast";
import { CloseIcon } from "@/components/pixel/icons";

interface Toast extends ToastInput {
  id: number;
}

const LIFETIME_MS = 6000;
const MAX_VISIBLE = 3;

/** Mounted once in the root layout. Toasts are cream pixel dialogs that dismiss themselves. */
export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let nextId = 1;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onToast = (e: Event) => {
      const id = nextId++;
      setToasts((list) => [...list, { ...(e as CustomEvent<ToastInput>).detail, id }].slice(-MAX_VISIBLE));
      const t = setTimeout(() => {
        setToasts((list) => list.filter((x) => x.id !== id));
        timers.delete(t);
      }, LIFETIME_MS);
      timers.add(t);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-3 px-4"
    >
      {toasts.map((t) => (
        <div key={t.id} className="px-dialog pointer-events-auto flex w-full max-w-sm items-start gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="mb-1 w-fit bg-ink px-2 py-0.5 font-display text-xs uppercase tracking-widest text-amber">
              {t.label}
            </p>
            <p className="font-display text-lg uppercase tracking-wide">{t.title}</p>
            {t.body && <p className="text-base leading-snug">{t.body}</p>}
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
            className="flex h-8 w-8 shrink-0 items-center justify-center border-[3px] border-ink text-ink hover:bg-ink hover:text-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber"
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  );
}
