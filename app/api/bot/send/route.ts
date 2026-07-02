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

/**
 * Server-side proxy for the Telegram notification bot so the bot API key
 * never reaches the browser. Configure BOT_URL and BOT_API_KEY (server env,
 * NOT NEXT_PUBLIC_*).
 */
export async function POST(req: NextRequest) {
  try {
    await ensureInit();

    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const botUrl = process.env.BOT_URL;
    const apiKey = process.env.BOT_API_KEY;
    if (!botUrl || !apiKey) {
      return NextResponse.json({ error: "Bot integration is not configured" }, { status: 503 });
    }

    let body: { chat_id?: number | string; text?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.chat_id || typeof body.text !== "string" || !body.text.trim()) {
      return NextResponse.json({ error: "chat_id and text are required" }, { status: 400 });
    }

    const response = await fetch(`${botUrl.replace(/\/$/, "")}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ chat_id: Number(body.chat_id), text: body.text }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Bot request failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[bot/send]", error);
    return NextResponse.json({ error: "Bot service unavailable" }, { status: 500 });
  }
}
