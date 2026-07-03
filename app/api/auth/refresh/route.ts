import { NextRequest, NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db, initDb } from "@/lib/db";
import { refresh_tokens, users } from "@/lib/db/schema";
import { verifyRefreshToken } from "@/lib/auth/jwt";
import { REFRESH_COOKIE, clearAuthCookies } from "@/lib/auth/cookies";
import { hashToken, issueSession, toPublicUser } from "@/lib/auth/issue";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

function unauthorized(): NextResponse {
  const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  clearAuthCookies(res);
  return res;
}

async function handlePost(req: NextRequest) {
  await ensureInit();

  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return unauthorized();

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) return unauthorized();

  const tokenHash = hashToken(refreshToken);
  const [stored] = await db()
    .select()
    .from(refresh_tokens)
    .where(and(eq(refresh_tokens.user_id, payload.sub), eq(refresh_tokens.token_hash, tokenHash)))
    .limit(1);

  // Unknown hash on a validly-signed token means it was already rotated —
  // treat as a possible replay and revoke everything for this user.
  if (!stored) {
    await db().delete(refresh_tokens).where(eq(refresh_tokens.user_id, payload.sub));
    return unauthorized();
  }

  if (stored.expires_at.getTime() < Date.now()) {
    await db().delete(refresh_tokens).where(eq(refresh_tokens.id, stored.id));
    return unauthorized();
  }

  const [user] = await db().select().from(users).where(eq(users.id, payload.sub)).limit(1);
  if (!user || user.token_version !== payload.tokenVersion) return unauthorized();

  // Rotate: the presented token is single-use.
  await db().delete(refresh_tokens).where(eq(refresh_tokens.id, stored.id));
  // Opportunistic cleanup of this user's expired tokens.
  await db()
    .delete(refresh_tokens)
    .where(and(eq(refresh_tokens.user_id, user.id), lt(refresh_tokens.expires_at, new Date())));

  return issueSession(user, { user: toPublicUser(user) });
}

export async function POST(req: NextRequest) {
  try {
    return await handlePost(req);
  } catch (error) {
    console.error("[auth/refresh]", error);
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 });
  }
}
