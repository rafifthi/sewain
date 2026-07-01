import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db, initDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/jwt";
import { createHash } from "crypto";
import { refresh_tokens } from "@/lib/db/schema";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

export async function POST(req: NextRequest) {
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

  const [user] = await db()
    .insert(users)
    .values({
      id: userId,
      email: normalizedEmail,
      name: name.trim(),
      password_hash,
      email_verified: true, // auto-verify for now
      token_version: 0,
      role_id: "admin",
      created_at: now,
      updated_at: now,
    })
    .returning();

  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);
  const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await db().insert(refresh_tokens).values({
    id: randomUUID(),
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_at: now,
  });

  return NextResponse.json(
    {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.role_id,
        emailVerified: user.email_verified,
      },
    },
    { status: 201 }
  );
}
