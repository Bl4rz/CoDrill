export class ApiError extends Error {
  status: number;
  reason?: string;

  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

export const BLOCKED_EVENT = "codrill:blocked";

export interface BlockedDetail {
  reason: "capacity" | "daily_limit";
  message: string;
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // The site-wide cap or your daily runs are used up: tell the page-level
    // BlockedScreen to show the full-screen message, wherever this was called from.
    if (data.reason === "capacity" || data.reason === "daily_limit") {
      window.dispatchEvent(
        new CustomEvent<BlockedDetail>(BLOCKED_EVENT, {
          detail: { reason: data.reason, message: data.error },
        }),
      );
    }
    throw new ApiError(data.error || "Something went wrong.", res.status, data.reason);
  }
  return data as T;
}
