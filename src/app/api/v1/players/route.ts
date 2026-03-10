import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { nhlPlayers, nhlTeams } from "@/lib/db/schema";
import { and, eq, ilike, sql } from "drizzle-orm";
import { success } from "@/lib/utils/api-response";

/**
 * GET /api/v1/players?q=mcdavid&position=forward&limit=20
 *
 * Search NHL players by name and/or position.
 * Only returns active players.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const position = searchParams.get("position");
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 50);

  const conditions = [eq(nhlPlayers.isActive, true)];

  if (query.length > 0) {
    conditions.push(ilike(nhlPlayers.fullName, `%${query}%`));
  }

  if (position && ["forward", "defenseman", "goalie"].includes(position)) {
    conditions.push(eq(nhlPlayers.positionGroup, position));
  }

  const players = await db
    .select({
      id: nhlPlayers.id,
      fullName: nhlPlayers.fullName,
      firstName: nhlPlayers.firstName,
      lastName: nhlPlayers.lastName,
      position: nhlPlayers.position,
      positionGroup: nhlPlayers.positionGroup,
      teamId: nhlPlayers.teamId,
      teamName: nhlTeams.name,
      headshotUrl: nhlPlayers.headshotUrl,
      salary: nhlPlayers.salary,
    })
    .from(nhlPlayers)
    .leftJoin(nhlTeams, eq(nhlPlayers.teamId, nhlTeams.id))
    .where(and(...conditions))
    .orderBy(nhlPlayers.fullName)
    .limit(limit);

  return success(players);
}
