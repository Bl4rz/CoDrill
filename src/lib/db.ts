import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The one way server code calls the database's SQL functions. In production it
 * uses the Supabase service-role client; tests swap in a transport that talks to
 * a real Postgres directly, so the real SQL runs under test.
 */
export type RpcTransport = <T>(fn: string, args: Record<string, unknown>) => Promise<T>;

let override: RpcTransport | null = null;

/** For tests only. Pass null to go back to Supabase. */
export function setRpcTransport(transport: RpcTransport | null) {
  override = transport;
}

export const dbConfigured = () => override !== null || createAdminClient() !== null;

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (override) return override<T>(fn, args);
  const admin = createAdminClient();
  if (!admin) throw new Error("This needs SUPABASE_SERVICE_ROLE_KEY on the server.");
  const { data, error } = await admin.rpc(fn, args);
  if (error) {
    const err = new Error(error.message) as Error & { code?: string };
    err.code = error.code;
    throw err;
  }
  return data as T;
}
