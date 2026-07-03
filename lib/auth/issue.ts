import { NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { db } from "@/lib/db";
import { refresh_tokens, type User } from "@/lib/db/schema";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/jwt";
import { setAuthCookies, REFRESH_TOKEN_TTL_S } from "@/lib/auth/cookies";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  roleId: string;
  emailVerified: boolean;
};

export function toPublicUser(user: Pick<User, "id" | "email" | "name" | "role_id" | "email_verified">): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.role_id,
    emailVerified: user.email_verified,
  };
}

/**
 * Issues a fresh access+refresh pair for `user`, persists the refresh-token
 * hash, and returns a JSON response with the tokens set as httpOnly cookies.
 * Tokens never appear in the response body.
 */
export async function issueSession(
  user: Pick<User, "id" | "email" | "name" | "role_id" | "token_version" | "email_verified">,
  body: Record<string, unknown>,
  status = 200
): Promise<NextResponse> {
  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);
  const now = new Date();

  await db().insert(refresh_tokens).values({
    id: randomUUID(),
    user_id: user.id,
    token_hash: hashToken(refreshToken),
    expires_at: new Date(now.getTime() + REFRESH_TOKEN_TTL_S * 1000),
    created_at: now,
  });

  const res = NextResponse.json(body, { status });
  setAuthCookies(res, accessToken, refreshToken);
  return res;
}
