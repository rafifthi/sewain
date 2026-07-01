import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "crypto";
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

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email } = body;
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always return success to avoid email enumeration
  const [user] = await db()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (user) {
    const rawToken = randomBytes(32).toString("hex");
    const token_hash = createHash("sha256").update(rawToken).digest("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    await db().insert(verification_tokens).values({
      id: randomUUID(),
      user_id: user.id,
      token_hash,
      type: "password_reset",
      expires_at: expiresAt,
      created_at: now,
    });

    // In production: send email with reset link
    // Reset link would be: /reset-password?token=<rawToken>
    console.log(`[forgot-password] reset token for ${email}: ${rawToken}`);
  }

  return NextResponse.json({ ok: true });
}
