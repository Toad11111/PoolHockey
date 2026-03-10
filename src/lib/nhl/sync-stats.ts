import { db } from "@/lib/db";
import { nhlGameStats, nhlPlayers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchNHL } from "./client";
import { SKATER_STAT_FIELDS, GOALIE_STAT_FIELDS } from "./stat-keys";
import type {
  ScoreResponse,
  BoxscoreResponse,
  SkaterGameStats,
  GoalieGameStats,
} from "./types";

interface StatRow {
  playerId: number;
  gameId: number;
  gameDate: string;
  statKey: string;
  statValue: string;
}

function extractSkaterStats(
  skater: SkaterGameStats,
  gameId: number,
  gameDate: string
): StatRow[] {
  const rows: StatRow[] = [];

  for (const { apiField, statKey } of SKATER_STAT_FIELDS) {
    const value = skater[apiField as keyof SkaterGameStats] as number;
    // Only store non-zero values (except plus_minus which can be negative)
    if (value !== 0 || statKey === "plus_minus") {
      if (value === 0 && statKey === "plus_minus") continue;
      rows.push({
        playerId: skater.playerId,
        gameId,
        gameDate,
        statKey,
        statValue: String(value),
      });
    }
  }

  return rows;
}

function extractGoalieStats(
  goalie: GoalieGameStats,
  gameId: number,
  gameDate: string
): StatRow[] {
  const rows: StatRow[] = [];

  // Standard goalie stats
  for (const { apiField, statKey } of GOALIE_STAT_FIELDS) {
    const value = goalie[apiField as keyof GoalieGameStats] as number;
    if (value !== 0) {
      rows.push({
        playerId: goalie.playerId,
        gameId,
        gameDate,
        statKey,
        statValue: String(value),
      });
    }
  }

  // Save percentage (can be 0 if no shots faced, but usually > 0)
  if (goalie.savePctg != null && goalie.savePctg > 0) {
    rows.push({
      playerId: goalie.playerId,
      gameId,
      gameDate,
      statKey: "save_pct",
      statValue: String(goalie.savePctg),
    });
  }

  // Win / Loss derived from decision field
  if (goalie.decision === "W") {
    rows.push({
      playerId: goalie.playerId,
      gameId,
      gameDate,
      statKey: "wins",
      statValue: "1",
    });
  } else if (goalie.decision === "L") {
    rows.push({
      playerId: goalie.playerId,
      gameId,
      gameDate,
      statKey: "losses",
      statValue: "1",
    });
  }

  // Shutout: starter who allowed 0 goals against
  if (goalie.starter && goalie.goalsAgainst === 0 && goalie.decision === "W") {
    rows.push({
      playerId: goalie.playerId,
      gameId,
      gameDate,
      statKey: "shutouts",
      statValue: "1",
    });
  }

  return rows;
}

/**
 * Sync game stats for a specific date.
 * Fetches the score page, then boxscores for each completed game.
 * Only processes players that exist in our nhl_players table.
 */
export async function syncStats(dateStr: string): Promise<{
  gamesFound: number;
  gamesProcessed: number;
  statsInserted: number;
}> {
  // Step 1: Get games for this date
  const scoreData = await fetchNHL<ScoreResponse>(`/v1/score/${dateStr}`);
  const games = scoreData.games ?? [];

  // Filter to completed games only
  const completedGames = games.filter(
    (g) => g.gameState === "OFF" || g.gameState === "FINAL"
  );

  console.log(
    `${dateStr}: ${games.length} games found, ${completedGames.length} completed`
  );

  if (completedGames.length === 0) {
    return { gamesFound: games.length, gamesProcessed: 0, statsInserted: 0 };
  }

  // Get all known player IDs for fast lookup
  const knownPlayers = await db
    .select({ id: nhlPlayers.id })
    .from(nhlPlayers);
  const knownPlayerIds = new Set(knownPlayers.map((p) => p.id));

  let totalStats = 0;

  // Step 2: For each completed game, fetch boxscore
  for (const game of completedGames) {
    console.log(
      `Processing game ${game.id}: ${game.awayTeam.abbrev} @ ${game.homeTeam.abbrev}`
    );

    let boxscore: BoxscoreResponse;
    try {
      boxscore = await fetchNHL<BoxscoreResponse>(
        `/v1/gamecenter/${game.id}/boxscore`
      );
    } catch (err) {
      console.warn(`Failed to fetch boxscore for game ${game.id}:`, err);
      continue;
    }

    const allStats: StatRow[] = [];

    // Process both teams
    for (const teamKey of ["awayTeam", "homeTeam"] as const) {
      const teamStats = boxscore.playerByGameStats[teamKey];
      if (!teamStats) continue;

      // Skaters (forwards + defense)
      const skaters = [
        ...(teamStats.forwards ?? []),
        ...(teamStats.defense ?? []),
      ];
      for (const skater of skaters) {
        if (!knownPlayerIds.has(skater.playerId)) continue;
        allStats.push(...extractSkaterStats(skater, game.id, dateStr));
      }

      // Goalies
      for (const goalie of teamStats.goalies ?? []) {
        if (!knownPlayerIds.has(goalie.playerId)) continue;
        allStats.push(...extractGoalieStats(goalie, game.id, dateStr));
      }
    }

    // Step 3: Upsert all stats for this game
    for (const stat of allStats) {
      await db
        .insert(nhlGameStats)
        .values({
          playerId: stat.playerId,
          gameId: stat.gameId,
          gameDate: stat.gameDate,
          statKey: stat.statKey,
          statValue: stat.statValue,
        })
        .onConflictDoUpdate({
          target: [nhlGameStats.playerId, nhlGameStats.gameId, nhlGameStats.statKey],
          set: { statValue: stat.statValue },
        });
    }

    totalStats += allStats.length;
    console.log(`  → ${allStats.length} stat rows upserted`);

    // Small delay between boxscore fetches
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return {
    gamesFound: games.length,
    gamesProcessed: completedGames.length,
    statsInserted: totalStats,
  };
}
