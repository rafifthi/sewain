import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, initDb } from "@/lib/db";
import { refresh_tokens, users } from "@/lib/db/schema";
import { verifyRefreshToken } from "@/lib/auth/jwt";
import { REFRESH_COOKIE, clearAuthCookies } from "@/lib/auth/cookies";
import { hashToken } from "@/lib/auth/issue";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

export async function POST(req: NextRequest) {
  const done = NextResponse.json({ ok: true });
  clearAuthCookies(done);

  try {
    await ensureInit();

    let body: { allDevices?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // no body — logout is best-effort
    }

    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) return done;

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) return done;

    if (body.allDevices) {
      // Increment token_version to invalidate all outstanding tokens.
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
      await db()
        .delete(refresh_tokens)
        .where(and(eq(refresh_tokens.user_id, payload.sub), eq(refresh_tokens.token_hash, hashToken(refreshToken))));
    }
  } catch (error) {
    console.error("[auth/logout]", error);
  }

  return done;
}
