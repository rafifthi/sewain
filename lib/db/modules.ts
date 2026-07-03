import { getTableColumns } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import {
  properties, units, tenants, reservations, invoices,
  expenses, tokens, contracts, tickets, documents, vendors,
} from "./schema";

/** UI row shape (see lib/data.ts) — flat records of strings/numbers. */
export type UiRow = { id: string; [key: string]: string | number };

type ModuleDef = { table: SQLiteTable; money: readonly string[] };

/**
 * Every persisted module, keyed by the client-side module name.
 * `money` lists columns stored as integer rupiah but rendered as
 * "Rp1.234.567" display strings in the UI.
 */
export const MODULES = {
  properties: { table: properties, money: ["pendapatan", "defaultPrice", "defaultDeposit"] },
  units: { table: units, money: ["sewa", "deposit", "tunggakan"] },
  tenants: { table: tenants, money: [] },
  reservations: { table: reservations, money: ["sewa", "deposit"] },
  invoices: { table: invoices, money: ["total", "sisa"] },
  expenses: { table: expenses, money: ["jumlah"] },
  tokens: { table: tokens, money: ["nominal", "biaya"] },
  contracts: { table: contracts, money: ["sewa", "deposit"] },
  tickets: { table: tickets, money: [] },
  documents: { table: documents, money: [] },
  vendors: { table: vendors, money: [] },
} as const satisfies Record<string, ModuleDef>;

export type ModuleName = keyof typeof MODULES;

export function isModuleName(name: string): name is ModuleName {
  return Object.prototype.hasOwnProperty.call(MODULES, name);
}

const BOOKKEEPING = new Set(["id", "org_id", "extra", "created_at", "updated_at"]);

/** "Rp1.200.000" | "1200000" | 1200000 → 1200000. Empty/garbage → 0. */
export function parseMoney(value: string | number): number {
  if (typeof value === "number") return Math.round(value);
  const negative = value.trim().startsWith("-");
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return negative ? -n : n;
}

/** 1200000 → "Rp1.200.000" (id-ID grouping, matches seed-data format). */
export function formatMoney(value: number): string {
  return `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
}

/** The org_id column object for a module's table (for WHERE clauses). */
export function orgIdColumn(module: ModuleName) {
  return getTableColumns(MODULES[module].table).org_id;
}

type ColumnInfo = { name: string; isInteger: boolean };

function moduleColumns(module: ModuleName): Map<string, ColumnInfo> {
  const cols = getTableColumns(MODULES[module].table);
  const map = new Map<string, ColumnInfo>();
  for (const [key, col] of Object.entries(cols)) {
    map.set(key, { name: col.name, isInteger: col.columnType === "SQLiteInteger" });
  }
  return map;
}

/** UI row → DB insert values. Unknown keys go into `extra` as JSON. */
export function toDbRow(module: ModuleName, row: UiRow, orgId: string, now: Date): Record<string, unknown> {
  const cols = moduleColumns(module);
  const money = new Set<string>(MODULES[module].money);
  const out: Record<string, unknown> = {
    id: String(row.id),
    org_id: orgId,
    created_at: now,
    updated_at: now,
  };
  const extra: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(row)) {
    if (key === "id" || value === undefined) continue;
    if (BOOKKEEPING.has(key)) continue;
    const col = cols.get(key);
    if (!col) {
      extra[key] = value;
    } else if (money.has(key)) {
      out[key] = parseMoney(value);
    } else if (col.isInteger) {
      const n = typeof value === "number" ? value : value === "" ? null : Number(value);
      out[key] = n === null || Number.isNaN(n) ? null : n;
    } else {
      out[key] = String(value);
    }
  }

  out.extra = Object.keys(extra).length ? JSON.stringify(extra) : null;
  return out;
}

/** DB row → UI row. Money columns are formatted back to display strings. */
export function toUiRow(module: ModuleName, dbRow: Record<string, unknown>): UiRow {
  const money = new Set<string>(MODULES[module].money);
  const row: Record<string, string | number> = {};

  if (typeof dbRow.extra === "string" && dbRow.extra) {
    try {
      Object.assign(row, JSON.parse(dbRow.extra));
    } catch {
      // extra was corrupted — drop it rather than fail the whole read
    }
  }

  for (const [key, value] of Object.entries(dbRow)) {
    if (BOOKKEEPING.has(key) && key !== "id") continue;
    if (value === null || value === undefined) continue;
    if (money.has(key) && typeof value === "number") {
      row[key] = formatMoney(value);
    } else if (typeof value === "string" || typeof value === "number") {
      row[key] = value;
    }
  }

  return { ...row, id: String(dbRow.id) };
}

/** CREATE TABLE/INDEX statements for a module, derived from the Drizzle schema. */
export function moduleDdl(module: ModuleName, tableName: string): string[] {
  const cols = getTableColumns(MODULES[module].table);
  const defs = Object.values(cols).map((col) => {
    const type = col.columnType === "SQLiteText" ? "TEXT" : "INTEGER";
    if (col.name === "id") return `id ${type} PRIMARY KEY`;
    const notNull = col.notNull ? " NOT NULL" : "";
    return `${col.name} ${type}${notNull}`;
  });
  return [
    `CREATE TABLE IF NOT EXISTS ${tableName} (${defs.join(", ")})`,
    `CREATE INDEX IF NOT EXISTS idx_${tableName}_org ON ${tableName}(org_id)`,
  ];
}
