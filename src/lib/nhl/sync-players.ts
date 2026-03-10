import { db } from "@/lib/db";
import { nhlTeams, nhlPlayers } from "@/lib/db/schema";
import { eq, notInArray } from "drizzle-orm";
import { fetchNHL } from "./client";
import { syncTeams } from "./sync-teams";
import type { RosterResponse, RosterPlayer } from "./types";
import { CURRENT_SEASON_API } from "@/lib/pools/season";

function mapPositionGroup(positionCode: string): string {
  switch (positionCode) {
    case "C":
    case "L":
    case "R":
      return "forward";
    case "D":
      return "defenseman";
    case "G":
      return "goalie";
    default:
      return "forward";
  }
}

/**
 * Sync all NHL teams, then fetch every team's roster and upsert players.
 * Players not found on any roster are marked inactive.
 */
export async function syncPlayers(): Promise<{ teams: number; players: number }> {
  // Step 1: Sync teams first
  const teamCount = await syncTeams();
  console.log(`Synced ${teamCount} teams`);

  // Step 2: Get all team abbreviations
  const allTeams = await db.select({ id: nhlTeams.id }).from(nhlTeams);
  const allPlayerIds: number[] = [];
  let playerCount = 0;

  // Step 3: For each team, fetch roster and upsert players
  for (const team of allTeams) {
    console.log(`Fetching roster for ${team.id}...`);

    let roster: RosterResponse;
    try {
      roster = await fetchNHL<RosterResponse>(
        `/v1/roster/${team.id}/${CURRENT_SEASON_API}`
      );
    } catch (err) {
      console.warn(`Failed to fetch roster for ${team.id}:`, err);
      continue;
    }

    const players: { section: string; list: RosterPlayer[] }[] = [
      { section: "forwards", list: roster.forwards ?? [] },
      { section: "defensemen", list: roster.defensemen ?? [] },
      { section: "goalies", list: roster.goalies ?? [] },
    ];

    for (const { list } of players) {
      for (const player of list) {
        const fullName = `${player.firstName.default} ${player.lastName.default}`;
        const positionGroup = mapPositionGroup(player.positionCode);

        await db
          .insert(nhlPlayers)
          .values({
            id: player.id,
            fullName,
            firstName: player.firstName.default,
            lastName: player.lastName.default,
            teamId: team.id,
            position: player.positionCode,
            positionGroup,
            isActive: true,
            headshotUrl: player.headshot ?? null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: nhlPlayers.id,
            set: {
              fullName,
              firstName: player.firstName.default,
              lastName: player.lastName.default,
              teamId: team.id,
              position: player.positionCode,
              positionGroup,
              isActive: true,
              headshotUrl: player.headshot ?? null,
              updatedAt: new Date(),
            },
          });

        allPlayerIds.push(player.id);
        playerCount++;
      }
    }

    // Small delay to be respectful to the NHL API
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // Step 4: Mark players not seen in any roster as inactive
  if (allPlayerIds.length > 0) {
    await db
      .update(nhlPlayers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(notInArray(nhlPlayers.id, allPlayerIds));
  }

  return { teams: teamCount, players: playerCount };
}
