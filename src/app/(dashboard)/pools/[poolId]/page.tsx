import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  pools,
  poolMembers,
  users,
  totalScores,
  dailyScores,
  rosterEntries,
  nhlPlayers,
  nhlGameStats,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { PoolPageClient } from "@/components/pools/pool-page-client";
import { calculatePoolScores } from "@/lib/scoring/engine";
import { syncStats } from "@/lib/nhl/sync-stats";
import type { RosterEntryData } from "@/components/pools/roster-view";
import type { TopPlayer } from "@/components/pools/top-players-card";

// ── SQL row types (raw postgres output) ───────────────────────────────────

type TopPlayerRow = {
  player_id: string;
  full_name: string;
  position: string;
  position_group: string;
  team_id: string | null;
  headshot_url: string | null;
  fantasy_points: string;
  goals: string;
  assists: string;
  wins: string;
  shutouts: string;
  saves: string;
};

type PoolTotalRow = {
  user_id: string;
  player_id: string;
  total_points: string;
};

type TotalStatsRow = {
  user_id: string;
  player_id: string;
  goals: string;
  assists: string;
};

type GoalieStatRow = {
  player_id: string;
  wins: string;
  saves: string;
  goals_against: string;
  shutouts: string;
};

// ── Page ──────────────────────────────────────────────────────────────────

export default async function PoolPage({
  params,
  searchParams,
}: {
  params: Promise<{ poolId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { poolId } = await params;
  const { date: dateParam } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login");

  // ── 1. Membership + pool ─────────────────────────────────────────────────

  const membership = await db.query.poolMembers.findFirst({
    where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, user.id)),
  });
  if (!membership) notFound();

  const pool = await db.query.pools.findFirst({
    where: eq(pools.id, poolId),
    with: { settings: true },
  });
  if (!pool) notFound();

  // ── 2. Today + selected date (defaults to today) ─────────────────────────

  // Server uses UTC as a best-effort "today" for queries when no date param is given.
  // The client (PoolPageClient) computes the real local today and redirects if needed.
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate: string = dateParam ?? today;
  const isExplicitDate = !!dateParam;

  // ── 3. Parallel: members + all rosters ───────────────────────────────────

  const [membersRaw, allRosterEntriesRaw] =
    await Promise.all([
      // Members with left-joined total scores
      db
        .select({
          userId:      poolMembers.userId,
          username:    users.username,
          displayName: users.displayName,
          role:        poolMembers.role,
          totalPoints: sql<string>`COALESCE(${totalScores.totalPoints}::text, '0.00')`,
        })
        .from(poolMembers)
        .innerJoin(users, eq(poolMembers.userId, users.id))
        .leftJoin(
          totalScores,
          and(
            eq(totalScores.poolId, poolId),
            eq(totalScores.userId, poolMembers.userId)
          )
        )
        .where(eq(poolMembers.poolId, poolId))
        .orderBy(poolMembers.joinedAt),

      // All roster entries with player info
      db
        .select({
          id:                  rosterEntries.id,
          userId:              rosterEntries.userId,
          playerId:            rosterEntries.playerId,
          rosterSlot:          rosterEntries.rosterSlot,
          addedAt:             rosterEntries.addedAt,
          playerFullName:      nhlPlayers.fullName,
          playerPosition:      nhlPlayers.position,
          playerPositionGroup: nhlPlayers.positionGroup,
          playerTeamId:        nhlPlayers.teamId,
          playerHeadshotUrl:   nhlPlayers.headshotUrl,
        })
        .from(rosterEntries)
        .innerJoin(nhlPlayers, eq(rosterEntries.playerId, nhlPlayers.id))
        .where(eq(rosterEntries.poolId, poolId))
        .orderBy(rosterEntries.addedAt),
    ]);

  // ── 5. Process members ───────────────────────────────────────────────────

  const members = [...membersRaw].sort(
    (a, b) => Number(b.totalPoints) - Number(a.totalPoints)
  );

  // ── 6. Build allRosters map (serialize addedAt Date → string) ────────────

  const allRosters: Record<string, RosterEntryData[]> = {};
  for (const e of allRosterEntriesRaw) {
    const entry: RosterEntryData = {
      id:                  e.id,
      userId:              e.userId,
      playerId:            e.playerId,
      rosterSlot:          e.rosterSlot,
      addedAt:             e.addedAt?.toISOString() ?? "",
      playerFullName:      e.playerFullName,
      playerPosition:      e.playerPosition,
      playerPositionGroup: e.playerPositionGroup,
      playerTeamId:        e.playerTeamId,
      playerHeadshotUrl:   e.playerHeadshotUrl,
    };
    (allRosters[entry.userId] ??= []).push(entry);
  }

  const allPlayerIds = [...new Set(allRosterEntriesRaw.map((e) => e.playerId))];
  const goaliePlayerIds = allRosterEntriesRaw
    .filter((e) => e.playerPositionGroup === "goalie")
    .map((e) => e.playerId);

  // ── 6b. Auto-sync stats + calculate scores for selected date if needed ───
  // Flow:
  //   1. If nhl_game_stats has no rows for this date → sync from NHL API first.
  //      (statsJustSynced = true when new data was written)
  //   2. If daily_scores has no rows, OR stats were just synced (stale zero-rows
  //      from a previous load-before-stats-existed are now outdated) → recalculate.
  if (selectedDate <= today && allPlayerIds.length > 0) {
    let statsJustSynced = false;

    const [existingStat] = await db
      .select({ playerId: nhlGameStats.playerId })
      .from(nhlGameStats)
      .where(eq(nhlGameStats.gameDate, selectedDate))
      .limit(1);

    if (!existingStat) {
      try {
        const result = await syncStats(selectedDate);
        statsJustSynced = result.gamesProcessed > 0;
      } catch { /* non-fatal */ }
    }

    const [existingScore] = statsJustSynced ? [null] : await db
      .select({ id: dailyScores.id })
      .from(dailyScores)
      .where(and(eq(dailyScores.poolId, poolId), eq(dailyScores.gameDate, selectedDate)))
      .limit(1);

    if (!existingScore) {
      try { await calculatePoolScores(poolId, selectedDate); } catch { /* non-fatal */ }
    }
  }

  // ── 7. Date-dependent queries (run in parallel) ──────────────────────────

  const [selectedDateBreakdowns, poolTotalRows, activeDateRows, activeDateTeamRows, totalStatsRows, topPlayersRows, goalieStatRows] =
    await Promise.all([
          // Breakdown for selected date (points + goals/assists per member)
          db
            .select({
              userId:    dailyScores.userId,
              breakdown: dailyScores.breakdown,
              points:    dailyScores.points,
            })
            .from(dailyScores)
            .where(
              and(
                eq(dailyScores.poolId, poolId),
                eq(dailyScores.gameDate, selectedDate)
              )
            ),

          // Pool-lifetime per-player points via jsonb_each
          db.execute(
            sql`
              SELECT
                ds.user_id,
                entry.key  AS player_id,
                SUM((entry.value->>'points')::numeric) AS total_points
              FROM daily_scores ds,
                   jsonb_each(ds.breakdown) AS entry(key, value)
              WHERE ds.pool_id = ${poolId}
                AND ds.breakdown IS NOT NULL
              GROUP BY ds.user_id, entry.key
            `
          ),

          // Rostered players who have any stat on the selected date = actually played.
          // Non-zero-only storage means scratched skaters and unused backup goalies
          // have no rows, so they are correctly excluded from the "Played" badge.
          allPlayerIds.length > 0
            ? db
                .selectDistinct({ playerId: nhlGameStats.playerId })
                .from(nhlGameStats)
                .where(
                  and(
                    eq(nhlGameStats.gameDate, selectedDate),
                    inArray(nhlGameStats.playerId, allPlayerIds)
                  )
                )
            : Promise.resolve([]),

          // Teams that had any game on the selected date — used to determine
          // whether a skater who has no stats was scratched vs. team didn't play.
          db.execute(
            sql`
              SELECT DISTINCT np.team_id
              FROM nhl_game_stats ngs
              JOIN nhl_players np ON np.id = ngs.player_id
              WHERE ngs.game_date = ${selectedDate}
                AND np.team_id IS NOT NULL
            `
          ),

          // Pool-lifetime per-player G+A from breakdown contributions (for total mode)
          db.execute(
            sql`
              SELECT
                ds.user_id,
                entry.key AS player_id,
                COALESCE(SUM(CASE WHEN contrib->>'statKey' = 'goals'
                    THEN (contrib->>'statValue')::numeric ELSE 0 END), 0) AS goals,
                COALESCE(SUM(CASE WHEN contrib->>'statKey' = 'assists'
                    THEN (contrib->>'statValue')::numeric ELSE 0 END), 0) AS assists
              FROM daily_scores ds,
                   jsonb_each(ds.breakdown) AS entry(key, value),
                   jsonb_array_elements(entry.value->'contributions') AS contrib
              WHERE ds.pool_id = ${poolId}
                AND ds.breakdown IS NOT NULL
              GROUP BY ds.user_id, entry.key
            `
          ),

          // Global top 5 NHL players by pool fantasy points for selected date
          db.execute(
            sql`
              SELECT
                np.id             AS player_id,
                np.full_name,
                np.position,
                np.position_group,
                np.team_id,
                np.headshot_url,
                SUM(CASE WHEN sr.id IS NOT NULL
                    THEN (ngs.stat_value * sr.points_value)::numeric
                    ELSE 0 END)                                            AS fantasy_points,
                SUM(CASE WHEN ngs.stat_key = 'goals'
                    THEN ngs.stat_value::numeric ELSE 0 END)              AS goals,
                SUM(CASE WHEN ngs.stat_key = 'assists'
                    THEN ngs.stat_value::numeric ELSE 0 END)              AS assists,
                SUM(CASE WHEN ngs.stat_key = 'wins'
                    THEN ngs.stat_value::numeric ELSE 0 END)              AS wins,
                SUM(CASE WHEN ngs.stat_key = 'shutouts'
                    THEN ngs.stat_value::numeric ELSE 0 END)              AS shutouts,
                SUM(CASE WHEN ngs.stat_key = 'saves'
                    THEN ngs.stat_value::numeric ELSE 0 END)              AS saves
              FROM nhl_game_stats ngs
              JOIN nhl_players np ON np.id = ngs.player_id
              LEFT JOIN scoring_rules sr
                ON sr.pool_id        = ${poolId}
               AND sr.stat_key       = ngs.stat_key
               AND sr.position_group = np.position_group
               AND sr.is_enabled     = true
              WHERE ngs.game_date = ${selectedDate}
              GROUP BY np.id, np.full_name, np.position, np.position_group, np.team_id, np.headshot_url
              HAVING SUM(CASE WHEN sr.id IS NOT NULL
                         THEN (ngs.stat_value * sr.points_value)::numeric
                         ELSE 0 END) > 0
              ORDER BY fantasy_points DESC
              LIMIT 5
            `
          ),

          // Per-goalie stats for the selected date (wins, saves, goalsAgainst, shutouts)
          goaliePlayerIds.length > 0
            ? db.execute(
                sql`
                  SELECT
                    ngs.player_id,
                    SUM(CASE WHEN ngs.stat_key = 'wins'
                        THEN ngs.stat_value ELSE 0 END) AS wins,
                    SUM(CASE WHEN ngs.stat_key = 'saves'
                        THEN ngs.stat_value ELSE 0 END) AS saves,
                    SUM(CASE WHEN ngs.stat_key = 'goals_against'
                        THEN ngs.stat_value ELSE 0 END) AS goals_against,
                    SUM(CASE WHEN ngs.stat_key = 'shutouts'
                        THEN ngs.stat_value ELSE 0 END) AS shutouts
                  FROM nhl_game_stats ngs
                  WHERE ngs.game_date = ${selectedDate}
                    AND ngs.player_id IN ${sql`(${sql.join(goaliePlayerIds.map((id) => sql`${id}`), sql`, `)})`}
                  GROUP BY ngs.player_id
                `
              )
            : Promise.resolve([]),
        ]);

  // ── 8. Build points maps ──────────────────────────────────────────────────

  // Selected-date goals/assists per member/player
  const selectedDatePoints: Record<string, Record<string, number>> = {};
  const playerStats: Record<
    string,
    Record<string, { goals: number; assists: number }>
  > = {};
  const dailyPointsMap: Record<string, string> = {};

  for (const row of selectedDateBreakdowns) {
    dailyPointsMap[row.userId] = row.points ?? "0";

    if (!row.breakdown) continue;
    const bd = row.breakdown as Record<
      string,
      { points?: number; contributions?: Array<{ statKey: string; statValue: number }> }
    >;

    selectedDatePoints[row.userId] = {};
    playerStats[row.userId] = {};

    for (const [pid, data] of Object.entries(bd)) {
      selectedDatePoints[row.userId][pid] = data.points ?? 0;

      const goals =
        data.contributions?.find((c) => c.statKey === "goals")?.statValue ?? 0;
      const assists =
        data.contributions?.find((c) => c.statKey === "assists")?.statValue ?? 0;
      if (goals > 0 || assists > 0) {
        playerStats[row.userId][pid] = { goals, assists };
      }
    }
  }

  // Pool-lifetime per-player totals
  const poolTotalPoints: Record<string, Record<string, number>> = {};
  for (const row of poolTotalRows as unknown as PoolTotalRow[]) {
    (poolTotalPoints[row.user_id] ??= {})[row.player_id] = Number(row.total_points);
  }

  // Pool-lifetime per-player G+A (for total mode roster display)
  const playerTotalStats: Record<string, Record<string, { goals: number; assists: number }>> = {};
  for (const row of totalStatsRows as unknown as TotalStatsRow[]) {
    (playerTotalStats[row.user_id] ??= {})[row.player_id] = {
      goals:   Number(row.goals),
      assists: Number(row.assists),
    };
  }

  const activeDateIds = activeDateRows.map((r) => r.playerId);
  const activeDateTeamIds = (activeDateTeamRows as unknown as { team_id: string }[])
    .map((r) => r.team_id)
    .filter(Boolean);

  // Per-goalie stats for the selected date
  const goalieStats: Record<string, { wins: number; saves: number; goalsAgainst: number; shutouts: number }> = {};
  for (const row of goalieStatRows as unknown as GoalieStatRow[]) {
    goalieStats[String(row.player_id)] = {
      wins:         Number(row.wins),
      saves:        Number(row.saves),
      goalsAgainst: Number(row.goals_against),
      shutouts:     Number(row.shutouts),
    };
  }

  // ── 9. Normalize global top players ──────────────────────────────────────

  const globalTopPlayers: TopPlayer[] = (
    topPlayersRows as unknown as TopPlayerRow[]
  ).map((r) => ({
    playerId:      Number(r.player_id),
    fullName:      r.full_name,
    position:      r.position,
    positionGroup: r.position_group,
    teamId:        r.team_id,
    headshotUrl:   r.headshot_url,
    fantasyPoints: Number(r.fantasy_points),
    goals:         Number(r.goals),
    assists:       Number(r.assists),
    wins:          Number(r.wins),
    shutouts:      Number(r.shutouts),
    saves:         Number(r.saves),
  }));

  // ── 10. Serialize settings for client ────────────────────────────────────

  const settings = pool.settings
    ? {
        rosterSize:    pool.settings.rosterSize,
        maxForwards:   pool.settings.maxForwards,
        maxDefensemen: pool.settings.maxDefensemen,
        maxGoalies:    pool.settings.maxGoalies,
        maxWildcards:  pool.settings.maxWildcards,
      }
    : null;

  return (
    <PoolPageClient
      pool={{
        id:         pool.id,
        name:       pool.name,
        season:     pool.season,
        status:     pool.status,
        inviteCode: pool.inviteCode,
      }}
      settings={settings}
      currentUserId={user.id}
      isHost={membership.role === "host"}
      members={members}
      allRosters={allRosters}
      selectedDate={selectedDate}
      selectedDatePoints={selectedDatePoints}
      playerStats={playerStats}
      playerTotalStats={playerTotalStats}
      poolTotalPoints={poolTotalPoints}
      activeDateIds={activeDateIds}
      activeDateTeamIds={activeDateTeamIds}
      goalieStats={goalieStats}
      today={today}
      isExplicitDate={isExplicitDate}
      dailyPointsMap={dailyPointsMap}
      globalTopPlayers={globalTopPlayers}
    />
  );
}
