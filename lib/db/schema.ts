import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password_hash: text("password_hash").notNull(),
  email_verified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  token_version: integer("token_version").notNull().default(0),
  role_id: text("role_id").notNull().default("admin"),
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refresh_tokens.$inferSelect;
export type VerificationToken = typeof verification_tokens.$inferSelect;
