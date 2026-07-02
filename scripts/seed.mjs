import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), ".data", "sewain.db");
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const client = createClient({ url: `file:${dbPath}` });

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

const seedUsers = [
  { email: "admin@example.com", name: "Admin", password: "password", roleId: "owner" },
  { email: "andi@sewain.id", name: "Andi Triono", password: "password", roleId: "owner" },
];

const now = Date.now();

for (const user of seedUsers) {
  const existing = await client.execute({
    sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
    args: [user.email],
  });

  if (existing.rows.length > 0) {
    console.log(`[seed] ${user.email} already exists, skipping`);
    continue;
  }

  await client.execute({
    sql: `
      INSERT INTO users (
        id, email, name, password_hash, email_verified,
        token_version, role_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      randomUUID(),
      user.email,
      user.name,
      await bcrypt.hash(user.password, 12),
      1,
      0,
      user.roleId,
      now,
      now,
    ],
  });

  console.log(`[seed] created ${user.email}`);
}

client.close();
console.log("[seed] done");
