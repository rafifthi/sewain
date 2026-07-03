import { randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "@/lib/db/schema";

let _secret: Uint8Array | null = null;

function jwtSecret(): Uint8Array {
  if (_secret) return _secret;
  const raw = process.env.SIGNOUTH_SECRET;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[sewain] SIGNOUTH_SECRET is not set — generating ephemeral secret. " +
          "All sessions will be invalidated on the next deploy. " +
          "Set SIGNOUTH_SECRET in your environment for persistent sessions."
      );
      _secret = new TextEncoder().encode(randomBytes(32).toString("hex"));
      return _secret;
    }
    _secret = new TextEncoder().encode("sewain-dev-secret-key-change-in-production");
    return _secret;
  }
  _secret = new TextEncoder().encode(raw);
  return _secret;
}

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  roleId: string;
  tokenVersion: number;
}

export async function generateAccessToken(user: Pick<User, "id" | "email" | "name" | "role_id" | "token_version">): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    roleId: user.role_id,
    tokenVersion: user.token_version,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(jwtSecret());
}

export async function generateRefreshToken(user: Pick<User, "id" | "token_version">): Promise<string> {
  return new SignJWT({
    sub: user.id,
    tokenVersion: user.token_version,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwtSecret());
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string; tokenVersion: number } | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return payload as unknown as { sub: string; tokenVersion: number };
  } catch {
    return null;
  }
}
