/**
 * Maps NHL API boxscore fields to our normalized stat keys.
 *
 * Skater stats are extracted directly from field names.
 * Goalie stats require some derived logic (wins, shutouts)
 * which is handled in sync-stats.ts.
 */

export const SKATER_STAT_FIELDS = [
  { apiField: "goals", statKey: "goals" },
  { apiField: "assists", statKey: "assists" },
  { apiField: "points", statKey: "points" },
  { apiField: "plusMinus", statKey: "plus_minus" },
  { apiField: "pim", statKey: "pim" },
  { apiField: "sog", statKey: "shots" },
  { apiField: "hits", statKey: "hits" },
  { apiField: "blockedShots", statKey: "blocked_shots" },
  { apiField: "powerPlayGoals", statKey: "pp_goals" },
] as const;

export const GOALIE_STAT_FIELDS = [
  { apiField: "saves", statKey: "saves" },
  { apiField: "goalsAgainst", statKey: "goals_against" },
] as const;

// All stat keys the system recognizes
export const ALL_STAT_KEYS = [
  // Skater
  "goals",
  "assists",
  "points",
  "plus_minus",
  "pim",
  "shots",
  "hits",
  "blocked_shots",
  "pp_goals",
  // Goalie
  "wins",
  "losses",
  "saves",
  "goals_against",
  "save_pct",
  "shutouts",
] as const;

export type StatKey = (typeof ALL_STAT_KEYS)[number];
