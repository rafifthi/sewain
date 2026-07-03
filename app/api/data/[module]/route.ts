import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, initDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { MODULES, isModuleName, orgIdColumn, toDbRow, toUiRow, type ModuleName, type UiRow } from "@/lib/db/modules";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}

const MAX_ROWS = 5000;
const INSERT_CHUNK = 50;

function resolveModule(raw: string): ModuleName | null {
  return isModuleName(raw) ? raw : null;
}

type RouteContext = { params: Promise<{ module: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    await ensureInit();

    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const module = resolveModule((await ctx.params).module);
    if (!module) return NextResponse.json({ error: "Unknown module" }, { status: 404 });

    const table = MODULES[module].table;
    const dbRows = await db()
      .select()
      .from(table)
      .where(eq(orgIdColumn(module), user.orgId));

    return NextResponse.json({ rows: dbRows.map((r) => toUiRow(module, r as Record<string, unknown>)) });
  } catch (error) {
    console.error("[data GET]", error);
    return NextResponse.json({ error: "Data service unavailable" }, { status: 500 });
  }
}

function validateRows(body: unknown): { rows: UiRow[] } | { error: string } {
  if (typeof body !== "object" || body === null || !Array.isArray((body as { rows?: unknown }).rows)) {
    return { error: "Body must be { rows: [...] }" };
  }
  const raw = (body as { rows: unknown[] }).rows;
  if (raw.length > MAX_ROWS) return { error: `Too many rows (max ${MAX_ROWS})` };

  const seen = new Map<string, UiRow>();
  for (const item of raw) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return { error: "Every row must be an object" };
    }
    const record = item as Record<string, unknown>;
    const id = record.id;
    if ((typeof id !== "string" && typeof id !== "number") || String(id).trim() === "") {
      return { error: "Every row needs a non-empty id" };
    }
    const row: UiRow = { id: String(id) };
    for (const [key, value] of Object.entries(record)) {
      if (key === "id" || value === undefined || value === null) continue;
      if (typeof value !== "string" && typeof value !== "number") {
        return { error: `Row ${id}: field "${key}" must be a string or number` };
      }
      row[key] = value;
    }
    seen.set(row.id, row); // last write wins on duplicate ids
  }
  return { rows: [...seen.values()] };
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    await ensureInit();

    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const module = resolveModule((await ctx.params).module);
    if (!module) return NextResponse.json({ error: "Unknown module" }, { status: 404 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const validated = validateRows(body);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const table = MODULES[module].table;
    const now = new Date();
    const dbRows = validated.rows.map((row) => toDbRow(module, row, user.orgId, now));

    await db().transaction(async (tx) => {
      await tx.delete(table).where(eq(orgIdColumn(module), user.orgId));
      for (let i = 0; i < dbRows.length; i += INSERT_CHUNK) {
        await tx.insert(table).values(dbRows.slice(i, i + INSERT_CHUNK) as never);
      }
    });

    return NextResponse.json({ ok: true, count: dbRows.length });
  } catch (error) {
    console.error("[data PUT]", error);
    return NextResponse.json({ error: "Data service unavailable" }, { status: 500 });
  }
}
