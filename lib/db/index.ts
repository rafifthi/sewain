import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

const DB_PATH = path.join(process.cwd(), ".data", "sewain.db");

function getClientConfig() {
  const url = process.env.TURSO_DATABASE_URL ?? process.env.LIBSQL_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.LIBSQL_AUTH_TOKEN;

  if (url) {
    return authToken ? { url, authToken } : { url };
  }

  ensureDataDir();
  return { url: `file:${DB_PATH}` };
}

function ensureDataDir() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
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
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      token_version INTEGER NOT NULL DEFAULT 0,
      role_id TEXT NOT NULL DEFAULT 'admin',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

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

  client.close();
}

export function db() {
  return getDb();
}
