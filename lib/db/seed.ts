import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import * as schema from "./schema";
import { users } from "./schema";
import path from "path";
import fs from "fs";

function getClient() {
  const url =
    process.env.TURSO_DB_URL || `file:${path.join(process.cwd(), ".data", "sewain.db")}`;
  const authToken = process.env.TURSO_DB_AUTH_TOKEN;
  return createClient({ url, ...(authToken ? { authToken } : {}) });
}

async function seed() {
  // Ensure local data dir exists if using file db
  if (!process.env.TURSO_DB_URL) {
    const dataDir = path.join(process.cwd(), ".data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  const client = getClient();
  const database = drizzle(client, { schema });

  // Create tables via drizzle-kit push instead for Turso
  // For local file db, init tables directly
  if (!process.env.TURSO_DB_URL) {
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
  }

  const seedUsers = [
    { email: "admin@example.com", name: "Admin", password: "password", role_id: "owner" },
    { email: "andi@sewain.id", name: "Andi Triono", password: "password", role_id: "owner" },
  ];

  const now = new Date();

  for (const u of seedUsers) {
    const [existing] = await database.select({ id: users.id }).from(users).where(eq(users.email, u.email)).limit(1);
    if (existing) {
      console.log(`[seed] ${u.email} already exists, skipping`);
      continue;
    }

    const password_hash = await bcrypt.hash(u.password, 12);
    await database.insert(users).values({
      id: randomUUID(),
      email: u.email,
      name: u.name,
      password_hash,
      email_verified: true,
      token_version: 0,
      role_id: u.role_id,
      created_at: now,
      updated_at: now,
    });

    console.log(`[seed] created ${u.email}`);
  }

  client.close();
  console.log("[seed] done");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
