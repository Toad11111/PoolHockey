import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const pools = pgTable(
  "pools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostId: uuid("host_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    status: text("status").notNull().default("setup"),
    season: text("season").notNull(),
    inviteCode: text("invite_code").unique().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_pools_host").on(table.hostId),
    index("idx_pools_invite").on(table.inviteCode),
  ]
);
