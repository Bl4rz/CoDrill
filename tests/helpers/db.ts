import pg from "pg";
import { randomUUID } from "node:crypto";

/** Marks a value to be sent as JSON (for jsonb arguments, including arrays). */
export class Json {
  constructor(public value: unknown) {}
}

const base = () => ({
  host: "localhost",
  port: Number(process.env.TEST_PG_PORT),
  user: "postgres",
  password: "pw",
});

export interface TestDb {
  pool: pg.Pool;
  /** A new row in auth.users */
  newUser(): Promise<string>;
  /** Call a server function the way the server does (service role, i.e. what the API routes use). */
  rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T>;
  /** The same call, shaped for setRpcTransport(): lets real server code run against this database. */
  transport: <T>(fn: string, args: Record<string, unknown>) => Promise<T>;
  /** Run SQL as a signed-in user (role `authenticated`, auth.uid() = userId). Always rolled back. */
  asUser<T>(userId: string, fn: (c: pg.PoolClient) => Promise<T>): Promise<T>;
  /** Run SQL as a signed-out visitor (role `anon`). Always rolled back. */
  asAnon<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** A fresh database cloned from the migrated template. */
export async function createTestDb(): Promise<TestDb> {
  const name = `t_${randomUUID().replace(/-/g, "")}`;
  const admin = new pg.Client({ ...base(), database: "postgres" });
  await admin.connect();
  await admin.query(`create database ${name} template template_app`);
  await admin.end();

  const pool = new pg.Pool({ ...base(), database: name, max: 12 });

  const inRole = async <T>(role: string, userId: string | null, fn: (c: pg.PoolClient) => Promise<T>) => {
    const c = await pool.connect();
    try {
      await c.query("begin");
      await c.query(`set local role ${role}`);
      await c.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
      return await fn(c);
    } finally {
      await c.query("rollback").catch(() => {});
      c.release();
    }
  };

  // Like PostgREST, send each argument according to the parameter type the function declares.
  const argTypes = new Map<string, Map<string, string>>();
  const typesOf = async (fn: string) => {
    const cached = argTypes.get(fn);
    if (cached) return cached;
    const { rows } = await pool.query(
      `select p.proargnames as names, p.proargtypes::text as types
         from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = $1`,
      [fn],
    );
    const map = new Map<string, string>();
    for (const r of rows) {
      const oids = String(r.types).split(" ").filter(Boolean).map(Number);
      const { rows: t } = await pool.query("select oid::int as oid, typname from pg_type where oid = any($1::oid[])", [oids]);
      const byOid = new Map<number, string>(t.map((x: { oid: number; typname: string }) => [x.oid, x.typname]));
      (r.names as string[] | null)?.forEach((n, i) => map.set(n, byOid.get(oids[i]) ?? ""));
    }
    argTypes.set(fn, map);
    return map;
  };

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const keys = Object.keys(args);
    const types = await typesOf(fn);
    const sql = `select public.${fn}(${keys.map((k, i) => `${k} := $${i + 1}`).join(", ")}) as r`;
    const params = keys.map((k) => {
      const v = args[k];
      if (v instanceof Json) return JSON.stringify(v.value);
      if (v === null || typeof v !== "object") return v;
      return types.get(k) === "jsonb" || types.get(k) === "json" ? JSON.stringify(v) : v;
    });
    const c = await pool.connect();
    try {
      await c.query("set role service_role");
      const res = await c.query(sql, params);
      return res.rows[0].r;
    } finally {
      await c.query("reset role").catch(() => {});
      c.release();
    }
  };

  return {
    pool,
    transport: rpc as TestDb["transport"],
    async newUser() {
      const id = randomUUID();
      await pool.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@test.local`]);
      return id;
    },
    rpc: rpc as TestDb["rpc"],
    asUser: (userId, fn) => inRole("authenticated", userId, fn),
    asAnon: (fn) => inRole("anon", null, fn),
    async close() {
      await pool.end();
      const a = new pg.Client({ ...base(), database: "postgres" });
      await a.connect();
      await a.query(`drop database if exists ${name} with (force)`);
      await a.end();
    },
  };
}
