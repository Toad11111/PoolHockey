import {
  pgTable,
  uuid,
  date,
  numeric,
  jsonb,
  timestamp,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { pools } from "./pools";
import { users } from "./users";

export const dailyScores = pgTable(
  "daily_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    gameDate: date("game_date").notNull(),
    points: numeric("points", { precision: 10, scale: 2 }).notNull().default("0"),
    breakdown: jsonb("breakdown"),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_daily_score").on(table.poolId, table.userId, table.gameDate),
    index("idx_daily_scores_lookup").on(table.poolId, table.gameDate),
  ]
);

export const totalScores = pgTable(
  "total_scores",
  {
    poolId: uuid("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    totalPoints: numeric("total_points", { precision: 12, scale: 2 }).notNull().default("0"),
    lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.poolId, table.userId] })]
);
