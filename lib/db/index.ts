import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import * as schema from "./schema";
import { MODULES, moduleDdl, isModuleName } from "./modules";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

let _db: Database | null = null;

const DB_PATH = path.join(process.cwd(), ".data", "sewain.db");

function resolveTursoUrl(): { url: string; authToken?: string } | null {
  const url =
    process.env.TURSO_DB_URL ??
    process.env.TURSO_DATABASE_URL ??
    process.env.LIBSQL_URL;
  if (!url) return null;

  const authToken =
    process.env.TURSO_DB_AUTH_TOKEN ??
    process.env.TURSO_AUTH_TOKEN ??
    process.env.LIBSQL_AUTH_TOKEN;
  return authToken ? { url, authToken } : { url };
}

function ensureDataDir() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

function getClientConfig() {
  const turso = resolveTursoUrl();
  if (turso) return turso;

  ensureDataDir();
  return { url: `file:${DB_PATH}` };
}

function getDb() {
  if (!_db) {
    const client = createClient(getClientConfig());
    _db = drizzle(client, { schema });
  }
  return _db;
}

export async function initDb() {
  const client = createClient(getClientConfig());

  await client.execute(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      token_version INTEGER NOT NULL DEFAULT 0,
      role_id TEXT NOT NULL DEFAULT 'admin',
      org_id TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Existing databases created before org support: add the column, then give
  // every org-less user their own organization.
  const userCols = await client.execute(`PRAGMA table_info(users)`);
  if (!userCols.rows.some((r) => r.name === "org_id")) {
    await client.execute(`ALTER TABLE users ADD COLUMN org_id TEXT NOT NULL DEFAULT ''`);
  }
  const orphans = await client.execute(`SELECT id, name FROM users WHERE org_id = ''`);
  for (const row of orphans.rows) {
    const orgId = randomUUID();
    const now = Date.now();
    await client.execute({
      sql: `INSERT INTO organizations (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      args: [orgId, `${row.name}'s workspace`, now, now],
    });
    await client.execute({
      sql: `UPDATE users SET org_id = ? WHERE id = ?`,
      args: [orgId, row.id],
    });
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('email_verify', 'password_reset')),
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  for (const module of Object.keys(MODULES)) {
    if (!isModuleName(module)) continue;
    for (const ddl of moduleDdl(module, module)) {
      await client.execute(ddl);
    }
  }

  // New columns added after a table already existed are not picked up by
  // CREATE TABLE IF NOT EXISTS. Reconcile them here so existing databases
  // (and the Turso remote) get the gender fields without a full migration.
  const GENDER_COLUMNS: Record<string, string[]> = {
    properties: ["genderRestriction"],
    tenants: ["jenisKelamin"],
  };
  for (const [table, columns] of Object.entries(GENDER_COLUMNS)) {
    const existing = await client.execute(`PRAGMA table_info(${table})`);
    const present = new Set(existing.rows.map((r) => String(r.name)));
    for (const column of columns) {
      if (!present.has(column)) {
        await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`);
      }
    }
  }

  client.close();
}

export function db() {
  return getDb();
}
