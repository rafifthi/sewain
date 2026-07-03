import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureInit();

    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.error("[auth/me]", error);
    return NextResponse.json({ error: "Authentication service unavailable" }, { status: 500 });
  }
}
