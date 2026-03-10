import {
  pgTable,
  integer,
  text,
  boolean,
  numeric,
  timestamp,
  date,
  uuid,
  unique,
  index,
} from "drizzle-orm/pg-core";

export const nhlTeams = pgTable("nhl_teams", {
  id: text("id").primaryKey(), // team abbreviation, e.g. "EDM", "TOR"
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const nhlPlayers = pgTable(
  "nhl_players",
  {
    id: integer("id").primaryKey(), // NHL player ID
    fullName: text("full_name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    teamId: text("team_id").references(() => nhlTeams.id),
    position: text("position").notNull(),
    positionGroup: text("position_group").notNull(),
    salary: integer("salary"), // NULL until salary pipeline (V2)
    isActive: boolean("is_active").notNull().default(true),
    headshotUrl: text("headshot_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_nhl_players_team").on(table.teamId),
    index("idx_nhl_players_position").on(table.positionGroup),
    index("idx_nhl_players_name").on(table.fullName),
  ]
);

export const nhlGameStats = pgTable(
  "nhl_game_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: integer("player_id")
      .notNull()
      .references(() => nhlPlayers.id),
    gameId: integer("game_id").notNull(),
    gameDate: date("game_date").notNull(),
    statKey: text("stat_key").notNull(),
    statValue: numeric("stat_value", { precision: 8, scale: 2 }).notNull(),
  },
  (table) => [
    unique("uq_game_stat").on(table.playerId, table.gameId, table.statKey),
    index("idx_game_stats_date").on(table.gameDate),
    index("idx_game_stats_player_date").on(table.playerId, table.gameDate),
  ]
);
