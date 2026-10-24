import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = 54500 + Math.floor(Math.random() * 400);

/**
 * Starts one real Postgres for the whole run and builds a template database with
 * the Supabase stand-in plus the real migration applied. Each DB test file clones
 * that template, so every file starts clean and runs against the migration as written.
 */
export default async function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codrill-pg-"));
  const server = new EmbeddedPostgres({
    databaseDir: dir,
    user: "postgres",
    password: "pw",
    port: PORT,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await server.initialise();
  await server.start();

  const admin = new pg.Client({ host: "localhost", port: PORT, user: "postgres", password: "pw", database: "postgres" });
  await admin.connect();
  await admin.query("create database template_app");
  await admin.end();

  const t = new pg.Client({ host: "localhost", port: PORT, user: "postgres", password: "pw", database: "template_app" });
  await t.connect();
  await t.query(fs.readFileSync(path.resolve(__dirname, "bootstrap.sql"), "utf8"));
  await t.query(
    fs.readFileSync(path.resolve(__dirname, "../../supabase/migrations/20261024000000_player_progression.sql"), "utf8"),
  );
  await t.end();

  process.env.TEST_PG_PORT = String(PORT);

  return async () => {
    await server.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  };
}
