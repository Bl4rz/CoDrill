export const TOAST_EVENT = "codrill:toast";

export interface ToastInput {
  label: string;
  title: string;
  body?: string;
}

/** Shows a small pixel dialog in the corner. Safe to call from any client code. */
export function showToast(toast: ToastInput) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastInput>(TOAST_EVENT, { detail: toast }));
}
