import { db } from "@/lib/db";
import {
  poolMembers,
  rosterEntries,
  nhlPlayers,
  nhlGameStats,
  scoringRules,
  dailyScores,
  totalScores,
} from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

type Contribution = {
  statKey: string;
  statValue: number;
  pointsValue: number;
  points: number;
};

type PlayerBreakdown = {
  playerName: string;
  positionGroup: string;
  rosterSlot: string;
  points: number;
  contributions: Contribution[];
};

// breakdown jsonb shape: { [playerId: string]: PlayerBreakdown }
type DailyBreakdown = Record<string, PlayerBreakdown>;

export async function calculatePoolScores(
  poolId: string,
  gameDate: string
): Promise<{ membersProcessed: number; scoresWritten: number }> {
  // 1. All members in the pool
  const members = await db
    .select({ userId: poolMembers.userId })
    .from(poolMembers)
    .where(eq(poolMembers.poolId, poolId));

  if (members.length === 0) return { membersProcessed: 0, scoresWritten: 0 };

  // 2. Roster entries active on gameDate: only include players added on or before the game date.
  //    This ensures players cannot earn retroactive points before they were picked up.
  const roster = await db
    .select({
      userId:        rosterEntries.userId,
      playerId:      rosterEntries.playerId,
      rosterSlot:    rosterEntries.rosterSlot,
      playerName:    nhlPlayers.fullName,
      positionGroup: nhlPlayers.positionGroup,
    })
    .from(rosterEntries)
    .innerJoin(nhlPlayers, eq(rosterEntries.playerId, nhlPlayers.id))
    .where(and(
      eq(rosterEntries.poolId, poolId),
      sql`${rosterEntries.addedAt}::date <= ${gameDate}::date`
    ));

  // 3. All game stats for rostered players on this date (single query)
  const playerIds = [...new Set(roster.map((r) => r.playerId))];
  const stats =
    playerIds.length > 0
      ? await db
          .select({
            playerId:  nhlGameStats.playerId,
            statKey:   nhlGameStats.statKey,
            statValue: nhlGameStats.statValue,
          })
          .from(nhlGameStats)
          .where(
            and(
              inArray(nhlGameStats.playerId, playerIds),
              eq(nhlGameStats.gameDate, gameDate)
            )
          )
      : [];

  // 4. Enabled scoring rules for this pool
  const rules = await db
    .select({
      statKey:       scoringRules.statKey,
      positionGroup: scoringRules.positionGroup,
      pointsValue:   scoringRules.pointsValue,
    })
    .from(scoringRules)
    .where(and(eq(scoringRules.poolId, poolId), eq(scoringRules.isEnabled, true)));

  // Build lookup: playerId → statKey → value
  const statsByPlayer = new Map<number, Map<string, number>>();
  for (const s of stats) {
    if (!statsByPlayer.has(s.playerId)) statsByPlayer.set(s.playerId, new Map());
    statsByPlayer.get(s.playerId)!.set(s.statKey, Number(s.statValue));
  }

  // Build lookup: positionGroup → statKey → pointsValue
  const ruleMap = new Map<string, Map<string, number>>();
  for (const r of rules) {
    if (!ruleMap.has(r.positionGroup)) ruleMap.set(r.positionGroup, new Map());
    ruleMap.get(r.positionGroup)!.set(r.statKey, Number(r.pointsValue));
  }

  // Build lookup: userId → roster entries
  const rosterByUser = new Map<string, typeof roster>();
  for (const entry of roster) {
    if (!rosterByUser.has(entry.userId)) rosterByUser.set(entry.userId, []);
    rosterByUser.get(entry.userId)!.push(entry);
  }

  // 5. Score each member and write rows
  let scoresWritten = 0;

  for (const { userId } of members) {
    const myRoster = rosterByUser.get(userId) ?? [];
    const breakdown: DailyBreakdown = {};
    let memberPoints = 0;

    for (const entry of myRoster) {
      const playerStats = statsByPlayer.get(entry.playerId) ?? new Map();
      const posRules    = ruleMap.get(entry.positionGroup) ?? new Map();
      const contributions: Contribution[] = [];
      let playerPoints = 0;

      for (const [statKey, pointsValue] of posRules) {
        const statValue = playerStats.get(statKey) ?? 0;
        if (statValue !== 0) {
          const earned = statValue * pointsValue;
          playerPoints += earned;
          contributions.push({ statKey, statValue, pointsValue, points: earned });
        }
      }

      breakdown[String(entry.playerId)] = {
        playerName:    entry.playerName,
        positionGroup: entry.positionGroup,
        rosterSlot:    entry.rosterSlot,
        points:        playerPoints,
        contributions,
      };

      memberPoints += playerPoints;
    }

    // Upsert daily_scores — always write even if 0 pts (per spec)
    await db
      .insert(dailyScores)
      .values({
        poolId,
        userId,
        gameDate,
        points:    String(memberPoints),
        breakdown: breakdown as unknown as null, // drizzle jsonb accepts objects
      })
      .onConflictDoUpdate({
        target: [dailyScores.poolId, dailyScores.userId, dailyScores.gameDate],
        set: {
          points:        String(memberPoints),
          breakdown:     breakdown as unknown as null,
          calculatedAt:  new Date(),
        },
      });

    // Recompute total by summing all daily_scores for this member in this pool
    const [totalRow] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${dailyScores.points}), 0)`,
      })
      .from(dailyScores)
      .where(and(eq(dailyScores.poolId, poolId), eq(dailyScores.userId, userId)));

    await db
      .insert(totalScores)
      .values({
        poolId,
        userId,
        totalPoints:  totalRow.total,
        lastUpdated:  new Date(),
      })
      .onConflictDoUpdate({
        target: [totalScores.poolId, totalScores.userId],
        set: {
          totalPoints: totalRow.total,
          lastUpdated: new Date(),
        },
      });

    scoresWritten++;
  }

  return { membersProcessed: members.length, scoresWritten };
}
