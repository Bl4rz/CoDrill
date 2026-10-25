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

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const keys = Object.keys(args);
    const sql = `select public.${fn}(${keys.map((k, i) => `${k} := $${i + 1}`).join(", ")}) as r`;
    const params = keys.map((k) => {
      const v = args[k];
      if (v instanceof Json) return JSON.stringify(v.value);
      if (v === null || typeof v !== "object") return v;
      // arrays of plain values are SQL arrays; everything else is sent as JSON
      return Array.isArray(v) && v.every((x) => x === null || typeof x !== "object") ? v : JSON.stringify(v);
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
