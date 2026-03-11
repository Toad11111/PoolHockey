import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { poolMembers, rosterEntries, nhlPlayers, scoringRules } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { fetchNHL } from "@/lib/nhl/client";
import { getUser } from "@/lib/auth/session";
import { success, error } from "@/lib/utils/api-response";
import type { ScoreResponse, BoxscoreResponse } from "@/lib/nhl/types";

// Game states that have started (live or finished)
const LIVE_STATES = new Set(["LIVE", "IN", "CRIT", "PRG"]);
const DONE_STATES = new Set(["OFF", "FINAL", "OVER"]);
const STARTED_STATES = new Set([...LIVE_STATES, ...DONE_STATES]);

export type TeamGameStatus = "live" | "played" | "later";

export type LivePlayerStat = {
  goals: number;
  assists: number;
  poolPoints: number;
  gameStatus: "live" | "played";
  // Goalie-only fields (only present when the goalie actually entered the game)
  wins?: number;
  saves?: number;
  goalsAgainst?: number;
  shutouts?: number;
};

// Shape returned in topPerformers — matches TopPlayer in top-players-card.tsx
type TopPerformerStat = {
  playerId: number;
  fullName: string;
  position: string;
  positionGroup: string;
  teamId: string | null;
  headshotUrl: string | null;
  fantasyPoints: number;
  goals: number;
  assists: number;
  wins: number;
  shutouts: number;
  saves: number;
};

type PlayerAccum = {
  goals: number;
  assists: number;
  wins: number;
  shutouts: number;
  saves: number;
  poolPoints: number;
};

/**
 * GET /api/v1/pools/:poolId/live
 *
 * Returns tonight's live/completed-game stats for:
 *   - `players`: pool-rostered players (for RosterView live badges)
 *   - `topPerformers`: top 5 ALL NHL players by pool points (for Top Performers card)
 *   - `teamSchedule`: team abbrev → "live" | "played" | "later" (for game status badges)
 *
 * Hits the NHL API directly — no DB cache. Designed to be polled every ~60s.
 * Uses Eastern time for the NHL schedule date (all NHL games are Eastern-date based).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { poolId } = await params;

  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const membership = await db.query.poolMembers.findFirst({
    where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, user.id)),
  });
  if (!membership) return error("FORBIDDEN", "Not a pool member", 403);

  // ── 1. Rosters + scoring rules + all player info (parallel) ──────────────

  const [rosters, rules, allPlayersRows] = await Promise.all([
    db
      .select({ playerId: rosterEntries.playerId })
      .from(rosterEntries)
      .where(eq(rosterEntries.poolId, poolId)),

    db
      .select({
        statKey:       scoringRules.statKey,
        positionGroup: scoringRules.positionGroup,
        pointsValue:   scoringRules.pointsValue,
      })
      .from(scoringRules)
      .where(and(eq(scoringRules.poolId, poolId), eq(scoringRules.isEnabled, true))),

    // Load all known NHL players so we have info for any player in a boxscore.
    // The table is ~750 rows — cheap to load in full.
    db
      .select({
        id:            nhlPlayers.id,
        fullName:      nhlPlayers.fullName,
        position:      nhlPlayers.position,
        positionGroup: nhlPlayers.positionGroup,
        teamId:        nhlPlayers.teamId,
        headshotUrl:   nhlPlayers.headshotUrl,
      })
      .from(nhlPlayers),
  ]);

  // scoring map: positionGroup → statKey → points
  const scoringMap: Record<string, Record<string, number>> = {};
  for (const rule of rules) {
    (scoringMap[rule.positionGroup] ??= {})[rule.statKey] = Number(rule.pointsValue);
  }

  // player info map: id → { fullName, position, positionGroup, teamId, headshotUrl }
  type PlayerInfo = { fullName: string; position: string; positionGroup: string; teamId: string | null; headshotUrl: string | null };
  const playerInfoMap: Record<number, PlayerInfo> = {};
  for (const p of allPlayersRows) {
    playerInfoMap[p.id] = {
      fullName:      p.fullName,
      position:      p.position,
      positionGroup: p.positionGroup,
      teamId:        p.teamId,
      headshotUrl:   p.headshotUrl,
    };
  }

  const rosterSet = new Set(rosters.map((r) => r.playerId));

  // ── 2. Tonight's schedule ─────────────────────────────────────────────────
  // NHL game dates are Eastern-time based — use Eastern time to avoid UTC
  // rollover querying tomorrow's (empty) schedule after ~midnight UTC.

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(new Date());

  const scoreData = await fetchNHL<ScoreResponse>(`/v1/score/${today}`).catch(() => null);

  const emptyResponse = { players: {}, hasLiveGames: false, topPerformers: [], teamSchedule: {}, date: today };
  if (!scoreData) return success(emptyResponse);

  const games = scoreData.games ?? [];

  // ── 3. Build team schedule map from ALL games today ───────────────────────
  // Priority: live > played > later (a team can't have multiple games in one night,
  // but defensively use the highest-priority state if somehow they do)

  const PRIORITY: Record<TeamGameStatus, number> = { live: 2, played: 1, later: 0 };
  const teamSchedule: Record<string, TeamGameStatus> = {};

  for (const game of games) {
    let status: TeamGameStatus;
    if (LIVE_STATES.has(game.gameState)) {
      status = "live";
    } else if (DONE_STATES.has(game.gameState)) {
      status = "played";
    } else {
      status = "later";
    }
    for (const abbrev of [game.awayTeam.abbrev, game.homeTeam.abbrev]) {
      const existing = teamSchedule[abbrev];
      if (!existing || PRIORITY[status] > PRIORITY[existing]) {
        teamSchedule[abbrev] = status;
      }
    }
  }

  const startedGames = games.filter((g) => STARTED_STATES.has(g.gameState));
  const hasLiveGames = games.some((g) => LIVE_STATES.has(g.gameState));

  if (startedGames.length === 0) {
    return success({ players: {}, hasLiveGames: false, topPerformers: [], teamSchedule, date: today });
  }

  // ── 4. Fetch all boxscores in parallel ────────────────────────────────────

  const boxscoreResults = await Promise.allSettled(
    startedGames.map((game) =>
      fetchNHL<BoxscoreResponse>(`/v1/gamecenter/${game.id}/boxscore`)
    )
  );

  // ── 5. Process stats for ALL players (and track rostered players separately) ──

  const allStatsMap: Record<string, PlayerAccum> = {};
  const rosterPlayerStats: Record<string, LivePlayerStat> = {};

  for (let i = 0; i < startedGames.length; i++) {
    const result = boxscoreResults[i];
    if (result.status === "rejected") continue;

    const boxscore = result.value;
    const game = startedGames[i];
    const isLiveGame = LIVE_STATES.has(game.gameState);

    for (const teamKey of ["awayTeam", "homeTeam"] as const) {
      const teamStats = boxscore.playerByGameStats?.[teamKey];
      if (!teamStats) continue;

      // Skaters (forwards + defense)
      const skaters = [...(teamStats.forwards ?? []), ...(teamStats.defense ?? [])];
      for (const skater of skaters) {
        const info = playerInfoMap[skater.playerId];
        if (!info) continue; // not in our DB, skip

        const scoring = scoringMap[info.positionGroup] ?? {};
        const goals   = skater.goals   ?? 0;
        const assists = skater.assists ?? 0;
        const poolPoints =
          goals   * (scoring["goals"]   ?? 0) +
          assists * (scoring["assists"] ?? 0);

        const key = String(skater.playerId);
        const ex = allStatsMap[key];
        allStatsMap[key] = {
          goals:      (ex?.goals      ?? 0) + goals,
          assists:    (ex?.assists    ?? 0) + assists,
          wins:       ex?.wins       ?? 0,
          shutouts:   ex?.shutouts   ?? 0,
          saves:      ex?.saves      ?? 0,
          poolPoints: (ex?.poolPoints ?? 0) + poolPoints,
        };

        if (rosterSet.has(skater.playerId)) {
          const r = rosterPlayerStats[key];
          // If any game for this player is live, status = live
          const prevStatus = r?.gameStatus;
          const gameStatus = isLiveGame || prevStatus === "live" ? "live" : "played";
          rosterPlayerStats[key] = {
            goals:      (r?.goals      ?? 0) + goals,
            assists:    (r?.assists    ?? 0) + assists,
            poolPoints: (r?.poolPoints ?? 0) + poolPoints,
            gameStatus,
          };
        }
      }

      // Goalies
      for (const goalie of teamStats.goalies ?? []) {
        const info = playerInfoMap[goalie.playerId];
        if (!info) continue;

        const scoring  = scoringMap["goalie"] ?? {};
        const wins     = goalie.decision === "W" ? 1 : 0;
        const shutouts = goalie.starter && goalie.goalsAgainst === 0 && goalie.decision === "W" ? 1 : 0;
        const saves    = goalie.saves ?? 0;
        const poolPoints =
          wins     * (scoring["wins"]     ?? 0) +
          shutouts * (scoring["shutouts"] ?? 0);

        const key = String(goalie.playerId);
        // Goalies don't play multiple games in a night — no need to accumulate
        allStatsMap[key] = {
          goals: 0, assists: 0,
          wins, shutouts, saves,
          poolPoints,
        };

        // Only add to roster stats if the goalie actually entered the game.
        // A backup who dressed but never played has toi "00:00" and 0 saves/goalsAgainst.
        const goalieActuallyPlayed =
          (goalie.toi != null && goalie.toi !== "00:00") ||
          (goalie.saves > 0) ||
          (goalie.goalsAgainst > 0);

        if (rosterSet.has(goalie.playerId) && goalieActuallyPlayed) {
          rosterPlayerStats[key] = {
            goals: 0, assists: 0,
            poolPoints,
            gameStatus: isLiveGame ? "live" : "played",
            wins,
            saves,
            goalsAgainst: goalie.goalsAgainst ?? 0,
            shutouts,
          };
        }
      }
    }
  }

  // ── 6. Top 5 performers across all NHL players ────────────────────────────

  const topPerformers: TopPerformerStat[] = Object.entries(allStatsMap)
    .filter(([, s]) => s.poolPoints > 0)
    .sort((a, b) => b[1].poolPoints - a[1].poolPoints)
    .slice(0, 5)
    .map(([pid, stats]) => {
      const id   = Number(pid);
      const info = playerInfoMap[id]!;
      return {
        playerId:      id,
        fullName:      info.fullName,
        position:      info.position,
        positionGroup: info.positionGroup,
        teamId:        info.teamId,
        headshotUrl:   info.headshotUrl,
        fantasyPoints: stats.poolPoints,
        goals:         stats.goals,
        assists:       stats.assists,
        wins:          stats.wins,
        shutouts:      stats.shutouts,
        saves:         stats.saves,
      };
    });

  return success({ players: rosterPlayerStats, hasLiveGames, topPerformers, teamSchedule, date: today });
}
