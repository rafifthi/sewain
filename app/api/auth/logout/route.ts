import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";
import { db, initDb } from "@/lib/db";
import { refresh_tokens, users } from "@/lib/db/schema";
import { verifyRefreshToken } from "@/lib/auth/jwt";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

export async function POST(req: NextRequest) {
  await ensureInit();

  let body: { refreshToken?: string; allDevices?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // ignore — logout is best-effort
  }

  if (!body.refreshToken) {
    return NextResponse.json({ ok: true });
  }

  const payload = await verifyRefreshToken(body.refreshToken);
  if (!payload) {
    return NextResponse.json({ ok: true });
  }

  if (body.allDevices) {
    // Increment token_version to invalidate all refresh tokens for this user
    const [user] = await db()
      .select({ token_version: users.token_version })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (user) {
      await db()
        .update(users)
        .set({ token_version: user.token_version + 1, updated_at: new Date() })
        .where(eq(users.id, payload.sub));
    }

    await db().delete(refresh_tokens).where(eq(refresh_tokens.user_id, payload.sub));
  } else {
    const tokenHash = createHash("sha256").update(body.refreshToken).digest("hex");
    await db()
      .delete(refresh_tokens)
      .where(and(eq(refresh_tokens.user_id, payload.sub), eq(refresh_tokens.token_hash, tokenHash)));
  }

  return NextResponse.json({ ok: true });
}
