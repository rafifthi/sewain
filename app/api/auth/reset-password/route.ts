import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db, initDb } from "@/lib/db";
import { users, verification_tokens } from "@/lib/db/schema";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

export async function POST(req: NextRequest) {
  await ensureInit();

  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token, password } = body;
  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const token_hash = createHash("sha256").update(token).digest("hex");
  const now = new Date();

  const [vToken] = await db()
    .select()
    .from(verification_tokens)
    .where(
      and(
        eq(verification_tokens.token_hash, token_hash),
        eq(verification_tokens.type, "password_reset"),
        gt(verification_tokens.expires_at, now)
      )
    )
    .limit(1);

  if (!vToken) {
    return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  await db()
    .update(users)
    .set({
      password_hash,
      token_version: 0,
      updated_at: now,
    })
    .where(eq(users.id, vToken.user_id));

  // Invalidate the used token
  await db().delete(verification_tokens).where(eq(verification_tokens.id, vToken.id));

  return NextResponse.json({ ok: true });
}
