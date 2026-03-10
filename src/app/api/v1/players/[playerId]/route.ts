import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { nhlPlayers, nhlTeams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { success, error } from "@/lib/utils/api-response";

/**
 * GET /api/v1/players/:playerId
 *
 * Get a single NHL player with team info.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId: playerIdStr } = await params;
  const playerId = parseInt(playerIdStr, 10);

  if (isNaN(playerId)) {
    return error("INVALID_ID", "Player ID must be a number", 400);
  }

  const result = await db
    .select({
      id: nhlPlayers.id,
      fullName: nhlPlayers.fullName,
      firstName: nhlPlayers.firstName,
      lastName: nhlPlayers.lastName,
      position: nhlPlayers.position,
      positionGroup: nhlPlayers.positionGroup,
      teamId: nhlPlayers.teamId,
      teamName: nhlTeams.name,
      teamLogo: nhlTeams.logoUrl,
      headshotUrl: nhlPlayers.headshotUrl,
      salary: nhlPlayers.salary,
      isActive: nhlPlayers.isActive,
    })
    .from(nhlPlayers)
    .leftJoin(nhlTeams, eq(nhlPlayers.teamId, nhlTeams.id))
    .where(eq(nhlPlayers.id, playerId))
    .limit(1);

  if (result.length === 0) {
    return error("NOT_FOUND", "Player not found", 404);
  }

  return success(result[0]);
}
