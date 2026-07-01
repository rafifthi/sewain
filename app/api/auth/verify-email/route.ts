import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { createHash } from "crypto";
import { db, initDb } from "@/lib/db";
import { users, verification_tokens } from "@/lib/db/schema";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

export async function GET(req: NextRequest) {
  await ensureInit();

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const token_hash = createHash("sha256").update(token).digest("hex");
  const now = new Date();

  const [vToken] = await db()
    .select()
    .from(verification_tokens)
    .where(
      and(
        eq(verification_tokens.token_hash, token_hash),
        eq(verification_tokens.type, "email_verify"),
        gt(verification_tokens.expires_at, now)
      )
    )
    .limit(1);

  if (!vToken) {
    return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
  }

  await db()
    .update(users)
    .set({ email_verified: true, updated_at: now })
    .where(eq(users.id, vToken.user_id));

  await db().delete(verification_tokens).where(eq(verification_tokens.id, vToken.id));

  return NextResponse.json({ ok: true });
}
