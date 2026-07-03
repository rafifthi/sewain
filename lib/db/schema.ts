import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password_hash: text("password_hash").notNull(),
  email_verified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  token_version: integer("token_version").notNull().default(0),
  role_id: text("role_id").notNull().default("admin"),
  org_id: text("org_id").notNull().references(() => organizations.id),
  created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const refresh_tokens = sqliteTable("refresh_tokens", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token_hash: text("token_hash").notNull(),
  expires_at: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const verification_tokens = sqliteTable("verification_tokens", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token_hash: text("token_hash").notNull(),
  type: text("type", { enum: ["email_verify", "password_reset"] }).notNull(),
  expires_at: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/*
 * Domain tables.
 *
 * Column names intentionally mirror the UI row keys (Indonesian domain terms)
 * so the data layer needs no per-module field mapping. Money columns store
 * integer rupiah; the API boundary formats them back to "Rp1.234.567" display
 * strings (see lib/db/modules.ts). `extra` holds any UI row key that has no
 * dedicated column, as a JSON object, so unknown keys survive a round trip.
 */

const orgScoped = {
  id: text("id").primaryKey(),
  org_id: text("org_id").notNull(),
  extra: text("extra"),
  created_at: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
};

export const properties = sqliteTable("properties", {
  ...orgScoped,
  nama: text("nama"),
  tipe: text("tipe"),
  lokasi: text("lokasi"),
  alamat: text("alamat"),
  unit: integer("unit"),
  terisi: integer("terisi"),
  pendapatan: integer("pendapatan"), // money
  status: text("status"),
  kontak: text("kontak"),
  contactName: text("contactName"),
  contactPhone: text("contactPhone"),
  labels: text("labels"),
  unitType: text("unitType"),
  unitQty: integer("unitQty"),
  generatedUnits: text("generatedUnits"),
  defaultPrice: integer("defaultPrice"), // money
  defaultDeposit: integer("defaultDeposit"), // money
  billingCycle: text("billingCycle"),
  image: text("image"),
  imageName: text("imageName"),
});

export const units = sqliteTable("units", {
  ...orgScoped,
  unit: text("unit"),
  tipe: text("tipe"),
  lantai: text("lantai"),
  penyewa: text("penyewa"),
  status: text("status"),
  sewa: integer("sewa"), // money
  deposit: integer("deposit"), // money
  tunggakan: integer("tunggakan"), // money
  meter: text("meter"),
  _propertiId: text("_propertiId"),
});

export const tenants = sqliteTable("tenants", {
  ...orgScoped,
  nama: text("nama"),
  telepon: text("telepon"),
  email: text("email"),
  telegram_id: text("telegram_id"),
  telegram_chat_id: text("telegram_chat_id"),
  nomorIdentitas: text("nomorIdentitas"),
  gambarIdentitas: text("gambarIdentitas"),
  kontakDarurat: text("kontakDarurat"),
  teleponDarurat: text("teleponDarurat"),
  unit: text("unit"),
  sejak: text("sejak"),
  periodeSewa: text("periodeSewa"),
  status: text("status"),
});

export const reservations = sqliteTable("reservations", {
  ...orgScoped,
  kode: text("kode"),
  penyewa: text("penyewa"),
  properti: text("properti"),
  unit: text("unit"),
  durasi: text("durasi"),
  sewa: integer("sewa"), // money
  deposit: integer("deposit"), // money
  jadwalMasuk: text("jadwalMasuk"),
  periode: text("periode"),
  jadwalKeluar: text("jadwalKeluar"),
  status: text("status"),
});

export const invoices = sqliteTable("invoices", {
  ...orgScoped,
  penyewa: text("penyewa"),
  unit: text("unit"),
  periode: text("periode"),
  jatuhTempo: text("jatuhTempo"),
  total: integer("total"), // money
  sisa: integer("sisa"), // money
  status: text("status"),
});

export const expenses = sqliteTable("expenses", {
  ...orgScoped,
  propertiId: text("propertiId"),
  nama: text("nama"),
  kategori: text("kategori"),
  jumlah: integer("jumlah"), // money
  tanggal: text("tanggal"),
  catatan: text("catatan"),
});

export const tokens = sqliteTable("tokens", {
  ...orgScoped,
  pelanggan: text("pelanggan"),
  unit: text("unit"),
  meter: text("meter"),
  nominal: integer("nominal"), // money
  biaya: integer("biaya"), // money
  status: text("status"),
  _unitId: text("_unitId"),
});

export const contracts = sqliteTable("contracts", {
  ...orgScoped,
  nomor: text("nomor"),
  penyewa: text("penyewa"),
  unit: text("unit"),
  dibuat: text("dibuat"),
  status: text("status"),
  properti: text("properti"),
  durasi: text("durasi"),
  periode: text("periode"),
  sewa: integer("sewa"), // money
  deposit: integer("deposit"), // money
  kontak: text("kontak"),
  jadwalMasuk: text("jadwalMasuk"),
  templateId: text("templateId"),
  _reservationId: text("_reservationId"),
  signedTenant: text("signedTenant"),
  signedTenantAt: text("signedTenantAt"),
  signedOwner: text("signedOwner"),
  signedOwnerAt: text("signedOwnerAt"),
});

export const tickets = sqliteTable("tickets", {
  ...orgScoped,
  tiket: text("tiket"),
  judul: text("judul"),
  properti: text("properti"),
  unit: text("unit"),
  penyewa: text("penyewa"),
  telepon: text("telepon"),
  masalah: text("masalah"),
  bukti: text("bukti"),
  vendor: text("vendor"),
  status: text("status"),
  createdAt: text("createdAt"),
  assignedAt: text("assignedAt"),
});

export const vendors = sqliteTable("vendors", {
  ...orgScoped,
  nama: text("nama"),
  kontak: text("kontak"),
  telepon: text("telepon"),
  labels: text("labels"),
  kota: text("kota"),
  status: text("status"),
});

export const documents = sqliteTable("documents", {
  ...orgScoped,
  nama: text("nama"),
  kategori: text("kategori"),
  terkait: text("terkait"),
  diperbarui: text("diperbarui"),
  status: text("status"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type RefreshToken = typeof refresh_tokens.$inferSelect;
export type VerificationToken = typeof verification_tokens.$inferSelect;
