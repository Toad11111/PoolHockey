import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

// This is a profile table that extends the Supabase auth.users table.
// The id column references auth.users.id — set on signup via trigger or app code.
// We do NOT store passwords or auth credentials here.
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // matches Supabase auth.users.id — no defaultRandom()
  email: text("email").unique().notNull(),
  username: text("username").unique().notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
