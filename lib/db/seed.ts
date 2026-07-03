import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import * as schema from "./schema";
import { users, organizations } from "./schema";
import { initDb } from "./index";
import path from "path";
import fs from "fs";

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

async function seed() {
  ensureDataDir();
  // initDb is idempotent and creates/migrates every table (auth + domain).
  await initDb();

  const client = createClient(getClientConfig());
  const database = drizzle(client, { schema });

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

    const orgId = randomUUID();
    await database.insert(organizations).values({
      id: orgId,
      name: `${u.name}'s workspace`,
      created_at: now,
      updated_at: now,
    });

    const password_hash = await bcrypt.hash(u.password, 12);
    await database.insert(users).values({
      id: randomUUID(),
      email: u.email,
      name: u.name,
      password_hash,
      email_verified: true,
      token_version: 0,
      role_id: u.role_id,
      org_id: orgId,
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
