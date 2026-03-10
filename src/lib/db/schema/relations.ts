import { relations } from "drizzle-orm";
import { users } from "./users";
import { pools } from "./pools";
import { poolSettings, scoringRules } from "./scoring";
import { poolMembers, rosterEntries } from "./rosters";
import { nhlPlayers, nhlTeams, nhlGameStats } from "./nhl";
import { dailyScores, totalScores } from "./leaderboard";

// ── Users ──────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  poolMemberships: many(poolMembers),
  rosterEntries:   many(rosterEntries),
  dailyScores:     many(dailyScores),
  totalScores:     many(totalScores),
}));

// ── Pools ──────────────────────────────────────────────
export const poolsRelations = relations(pools, ({ one, many }) => ({
  host:         one(users, { fields: [pools.hostId], references: [users.id] }),
  settings:     one(poolSettings, { fields: [pools.id], references: [poolSettings.poolId] }),
  scoringRules: many(scoringRules),
  members:      many(poolMembers),
  rosterEntries: many(rosterEntries),
  dailyScores:  many(dailyScores),
  totalScores:  many(totalScores),
}));

// ── Pool Settings ──────────────────────────────────────
export const poolSettingsRelations = relations(poolSettings, ({ one }) => ({
  pool: one(pools, { fields: [poolSettings.poolId], references: [pools.id] }),
}));

// ── Scoring Rules ──────────────────────────────────────
export const scoringRulesRelations = relations(scoringRules, ({ one }) => ({
  pool: one(pools, { fields: [scoringRules.poolId], references: [pools.id] }),
}));

// ── Pool Members ───────────────────────────────────────
export const poolMembersRelations = relations(poolMembers, ({ one }) => ({
  pool: one(pools, { fields: [poolMembers.poolId], references: [pools.id] }),
  user: one(users, { fields: [poolMembers.userId], references: [users.id] }),
}));

// ── Roster Entries ─────────────────────────────────────
export const rosterEntriesRelations = relations(rosterEntries, ({ one }) => ({
  pool:   one(pools,      { fields: [rosterEntries.poolId],    references: [pools.id] }),
  user:   one(users,      { fields: [rosterEntries.userId],    references: [users.id] }),
  player: one(nhlPlayers, { fields: [rosterEntries.playerId],  references: [nhlPlayers.id] }),
}));

// ── NHL Teams ──────────────────────────────────────────
export const nhlTeamsRelations = relations(nhlTeams, ({ many }) => ({
  players: many(nhlPlayers),
}));

// ── NHL Players ────────────────────────────────────────
export const nhlPlayersRelations = relations(nhlPlayers, ({ one, many }) => ({
  team:          one(nhlTeams, { fields: [nhlPlayers.teamId], references: [nhlTeams.id] }),
  gameStats:     many(nhlGameStats),
  rosterEntries: many(rosterEntries),
}));

// ── NHL Game Stats ─────────────────────────────────────
export const nhlGameStatsRelations = relations(nhlGameStats, ({ one }) => ({
  player: one(nhlPlayers, { fields: [nhlGameStats.playerId], references: [nhlPlayers.id] }),
}));

// ── Daily Scores ───────────────────────────────────────
export const dailyScoresRelations = relations(dailyScores, ({ one }) => ({
  pool: one(pools, { fields: [dailyScores.poolId], references: [pools.id] }),
  user: one(users, { fields: [dailyScores.userId], references: [users.id] }),
}));

// ── Total Scores ───────────────────────────────────────
export const totalScoresRelations = relations(totalScores, ({ one }) => ({
  pool: one(pools, { fields: [totalScores.poolId], references: [pools.id] }),
  user: one(users, { fields: [totalScores.userId], references: [users.id] }),
}));
