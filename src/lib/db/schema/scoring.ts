import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { pools } from "./pools";

export const poolSettings = pgTable("pool_settings", {
  poolId: uuid("pool_id")
    .primaryKey()
    .references(() => pools.id, { onDelete: "cascade" }),
  salaryCap: integer("salary_cap"), // NULL = disabled (V2)
  rosterSize: integer("roster_size").notNull(),
  maxForwards: integer("max_forwards").notNull(),
  maxDefensemen: integer("max_defensemen").notNull(),
  maxGoalies: integer("max_goalies").notNull(),
  maxWildcards: integer("max_wildcards").notNull().default(0),
  scoringMode: text("scoring_mode").notNull().default("classic"),
  allowTrades: boolean("allow_trades").notNull().default(false),
  allowSwaps: boolean("allow_swaps").notNull().default(false),
});

export const scoringRules = pgTable(
  "scoring_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id")
      .notNull()
      .references(() => pools.id, { onDelete: "cascade" }),
    statKey: text("stat_key").notNull(),
    positionGroup: text("position_group").notNull(),
    pointsValue: numeric("points_value", { precision: 5, scale: 2 }).notNull(),
    isEnabled: boolean("is_enabled").notNull().default(true),
  },
  (table) => [
    unique("uq_scoring_rule").on(table.poolId, table.statKey, table.positionGroup),
    index("idx_scoring_rules_pool").on(table.poolId),
  ]
);
