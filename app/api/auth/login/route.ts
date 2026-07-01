import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import { db, initDb } from "@/lib/db";
import { users, refresh_tokens } from "@/lib/db/schema";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/jwt";
import { checkRateLimit } from "@/lib/auth/rate-limit";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const rl = checkRateLimit(`login:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  await ensureInit();

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const [user] = await db().select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);
  const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await db().insert(refresh_tokens).values({
    id: randomUUID(),
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_at: now,
  });

  return NextResponse.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.role_id,
      emailVerified: user.email_verified,
    },
  });
}
