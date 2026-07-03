import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db, initDb } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { issueSession, toPublicUser } from "@/lib/auth/issue";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

async function handlePost(req: NextRequest) {
  await ensureInit();

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, name } = body;
  if (!email || !password || !name) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const [existing] = await db().select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const now = new Date();
  const userId = randomUUID();
  const orgId = randomUUID();

  await db().insert(organizations).values({
    id: orgId,
    name: `${name.trim()}'s workspace`,
    created_at: now,
    updated_at: now,
  });

  let user;
  try {
    [user] = await db()
      .insert(users)
      .values({
        id: userId,
        email: normalizedEmail,
        name: name.trim(),
        password_hash,
        email_verified: true, // auto-verify for now
        token_version: 0,
        role_id: "admin",
        org_id: orgId,
        created_at: now,
        updated_at: now,
      })
      .returning();
  } catch (error) {
    // Two signups can pass the pre-check concurrently; the unique index on
    // email settles the race.
    try {
      await db().delete(organizations).where(eq(organizations.id, orgId));
    } catch {
      // best-effort cleanup of the orphaned org
    }
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    throw error;
  }

  return issueSession(user, { user: toPublicUser(user) }, 201);
}

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (error) {
    console.error("[auth/signup]", error);
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 });
  }
}
