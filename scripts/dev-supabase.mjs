#!/usr/bin/env node
/**
 * LOCAL DEV ONLY. A small stand-in for Supabase so the app can be run end to end
 * without a Supabase project or Docker:
 *   - a real Postgres (from the `embedded-postgres` npm package) with the Supabase
 *     roles, auth.users / auth.uid(), and the real progression migration applied;
 *   - GET  /auth/v1/user         validates a dev-signed JWT
 *   - POST /rest/v1/rpc/:fn      runs the progression functions as service_role
 *   - POST /dev/users            creates a test user and returns a session cookie
 * Everything else under /rest/v1 answers with an empty list so the app's optional
 * cloud sync is a no-op. This is NOT secure and is never used in production.
 *
 *   npm run dev:supabase            start it (data kept in .local/supabase-dev)
 *   npm run dev:supabase -- --reset wipe the data first and re-apply the migration
 *
 * Then run the app against it (see npm run dev:local).
 */
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(root, ".local", "supabase-dev");
const PG_PORT = 54329;
const API_PORT = 54321;
const JWT_SECRET = "dev-only-jwt-secret";
export const DEV_ANON_KEY = "dev-anon-key";
export const DEV_SERVICE_KEY = "dev-service-role-key";

if (process.argv.includes("--reset")) fs.rmSync(DATA_DIR, { recursive: true, force: true });
const fresh = !fs.existsSync(path.join(DATA_DIR, "PG_VERSION"));

const server = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "pw",
  port: PG_PORT,
  persistent: true,
  onLog: () => {},
  onError: () => {},
});
if (fresh) await server.initialise();
await server.start();

const pool = new pg.Pool({ host: "localhost", port: PG_PORT, user: "postgres", password: "pw", database: "postgres", max: 8 });

const { rows: have } = await pool.query("select to_regclass('public.player_progression') as t");
if (!have[0].t) {
  const bootstrap = fs.readFileSync(path.join(root, "tests/helpers/bootstrap.sql"), "utf8");
  const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261024000000_player_progression.sql"), "utf8");
  await pool.query(bootstrap);
  await pool.query(migration);
  console.log("applied bootstrap + migration");
}

const b64url = (b) => Buffer.from(b).toString("base64url");
function signJwt(payload) {
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
function verifyJwt(token) {
  const [h, b, s] = token.split(".");
  if (!h || !b || !s) return null;
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${b}`).digest("base64url");
  if (expected !== s) return null;
  const payload = JSON.parse(Buffer.from(b, "base64url").toString());
  return payload.exp * 1000 > Date.now() ? payload : null;
}

function sessionFor(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const access_token = signJwt({ sub: user.id, role: "authenticated", aud: "authenticated", email: user.email, exp });
  return {
    access_token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    refresh_token: `dev-refresh-${user.id}`,
    user: userJson(user),
  };
}
const userJson = (u) => ({
  id: u.id,
  aud: "authenticated",
  role: "authenticated",
  email: u.email,
  app_metadata: { provider: "google", providers: ["google"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
});

function cors(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "*");
  res.setHeader("access-control-allow-methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
}
const send = (res, status, body) => {
  cors(res);
  if (body === undefined) {
    res.writeHead(status);
    return res.end();
  }
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });

const bearer = (req) => (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${API_PORT}`);
    if (req.method === "OPTIONS") return send(res, 204);

    if (url.pathname === "/auth/v1/user") {
      const payload = verifyJwt(bearer(req));
      if (!payload) return send(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
      const { rows } = await pool.query("select id, email from auth.users where id = $1", [payload.sub]);
      if (!rows[0]) return send(res, 404, { code: 404, error_code: "user_not_found", msg: "no such user" });
      return send(res, 200, userJson(rows[0]));
    }

    if (url.pathname === "/auth/v1/token") {
      const body = await readBody(req);
      const id = String(body.refresh_token || "").replace("dev-refresh-", "");
      const { rows } = await pool.query("select id, email from auth.users where id = $1", [id]);
      if (!rows[0]) return send(res, 400, { error: "invalid_grant" });
      return send(res, 200, sessionFor(rows[0]));
    }

    if (url.pathname === "/auth/v1/logout") return send(res, 204);

    if (url.pathname === "/dev/users" && req.method === "POST") {
      const body = await readBody(req);
      const email = body.email || `player-${crypto.randomUUID().slice(0, 8)}@dev.local`;
      const { rows } = await pool.query(
        "insert into auth.users (email) values ($1) returning id, email",
        [email],
      );
      const session = sessionFor(rows[0]);
      return send(res, 200, {
        id: rows[0].id,
        email,
        cookieName: "sb-localhost-auth-token",
        cookieValue: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
      });
    }

    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
    if (rpc && req.method === "POST") {
      if (bearer(req) !== DEV_SERVICE_KEY && req.headers.apikey !== DEV_SERVICE_KEY) {
        return send(res, 401, { code: "42501", message: "permission denied", details: null, hint: null });
      }
      const args = await readBody(req);
      const keys = Object.keys(args);
      const sql = `select public.${rpc[1]}(${keys.map((k, i) => `${k} := $${i + 1}`).join(", ")}) as r`;
      const params = keys.map((k) => {
        const v = args[k];
        if (v === null || typeof v !== "object") return v;
        // arrays of plain values are SQL arrays (text[]); everything else is jsonb
        return Array.isArray(v) && v.every((x) => x === null || typeof x !== "object") ? v : JSON.stringify(v);
      });
      const client = await pool.connect();
      try {
        await client.query("set role service_role");
        const out = await client.query(sql, params);
        const value = out.rows[0].r;
        return value === null ? send(res, 204) : send(res, 200, value);
      } catch (err) {
        return send(res, 400, { code: err.code, message: err.message, details: null, hint: null });
      } finally {
        await client.query("reset role").catch(() => {});
        client.release();
      }
    }

    if (url.pathname.startsWith("/rest/v1/")) {
      return req.method === "GET" ? send(res, 200, []) : send(res, 201, []);
    }
    send(res, 404, { error: "not found" });
  })
  .listen(API_PORT, () => {
    console.log(`dev Supabase ready: http://localhost:${API_PORT} (Postgres on ${PG_PORT})`);
    console.log(`  anon key:         ${DEV_ANON_KEY}`);
    console.log(`  service role key: ${DEV_SERVICE_KEY}`);
    console.log(`  create a test user: curl -X POST http://localhost:${API_PORT}/dev/users`);
  });

const shutdown = async () => {
  await pool.end().catch(() => {});
  await server.stop().catch(() => {});
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
