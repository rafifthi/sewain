import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  emailVerified: boolean;
  orgId: string;
}

function readAccessToken(req: NextRequest): string | null {
  const cookie = req.cookies.get(ACCESS_COOKIE)?.value;
  if (cookie) return cookie;
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

/**
 * Verifies the access token and re-checks the user row (token_version) so
 * revoked sessions are rejected. Use in every route handler that touches data.
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = readAccessToken(req);
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  const [user] = await db()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role_id: users.role_id,
      email_verified: users.email_verified,
      token_version: users.token_version,
      org_id: users.org_id,
    })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user) return null;
  if (user.token_version !== payload.tokenVersion) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.role_id,
    emailVerified: user.email_verified,
    orgId: user.org_id,
  };
}
