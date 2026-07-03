import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, initDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { issueSession, toPublicUser } from "@/lib/auth/issue";
import { checkRateLimit } from "@/lib/auth/rate-limit";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

async function handlePost(req: NextRequest) {
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

  return issueSession(user, { user: toPublicUser(user) });
}

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 });
  }
}
