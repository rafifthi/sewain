import { SignJWT, jwtVerify } from "jose";
import type { User } from "@/lib/db/schema";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SIGNOUTH_SECRET ?? "sewain-dev-secret-key-change-in-production"
);

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
    .sign(JWT_SECRET);
}

export async function generateRefreshToken(user: Pick<User, "id" | "token_version">): Promise<string> {
  return new SignJWT({
    sub: user.id,
    tokenVersion: user.token_version,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string; tokenVersion: number } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as { sub: string; tokenVersion: number };
  } catch {
    return null;
  }
}
