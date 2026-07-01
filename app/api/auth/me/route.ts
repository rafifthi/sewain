import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, initDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyAccessToken } from "@/lib/auth/jwt";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

export async function GET(req: NextRequest) {
  await ensureInit();

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = await verifyAccessToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const [user] = await db()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role_id: users.role_id,
      email_verified: users.email_verified,
      token_version: users.token_version,
    })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.token_version !== payload.tokenVersion) {
    return NextResponse.json({ error: "Token revoked" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.role_id,
    emailVerified: user.email_verified,
  });
}
