import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  pools,
  poolMembers,
  rosterEntries,
  nhlPlayers,
  users,
} from "@/lib/db/schema";
import { and, eq, count } from "drizzle-orm";
import { getUser } from "@/lib/auth/session";
import { success, error } from "@/lib/utils/api-response";
import { z } from "zod/v4";

const addPlayerSchema = z.object({
  playerId: z.number().int().positive(),
});

type Params = { params: Promise<{ poolId: string }> };

/**
 * GET /api/v1/pools/:poolId/roster
 * List roster entries. ?userId=me|<uuid> to filter to one member.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const { poolId } = await params;

  const membership = await db.query.poolMembers.findFirst({
    where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, user.id)),
  });
  if (!membership) return error("FORBIDDEN", "You are not a member of this pool", 403);

  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get("userId");
  const resolvedUserId =
    userIdParam === "me" ? user.id : userIdParam ?? undefined;

  const conditions = [eq(rosterEntries.poolId, poolId)];
  if (resolvedUserId) {
    conditions.push(eq(rosterEntries.userId, resolvedUserId));
  }

  const entries = await db
    .select({
      id: rosterEntries.id,
      userId: rosterEntries.userId,
      playerId: rosterEntries.playerId,
      rosterSlot: rosterEntries.rosterSlot,
      addedAt: rosterEntries.addedAt,
      playerFullName: nhlPlayers.fullName,
      playerPosition: nhlPlayers.position,
      playerPositionGroup: nhlPlayers.positionGroup,
      playerTeamId: nhlPlayers.teamId,
      playerHeadshotUrl: nhlPlayers.headshotUrl,
      username: users.username,
      displayName: users.displayName,
    })
    .from(rosterEntries)
    .innerJoin(nhlPlayers, eq(rosterEntries.playerId, nhlPlayers.id))
    .innerJoin(users, eq(rosterEntries.userId, users.id))
    .where(and(...conditions))
    .orderBy(rosterEntries.addedAt);

  return success(entries);
}

/**
 * POST /api/v1/pools/:poolId/roster
 * Add a player to the calling user's roster.
 * Body: { playerId: number }
 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const { poolId } = await params;

  const pool = await db.query.pools.findFirst({
    where: eq(pools.id, poolId),
    with: { settings: true },
  });
  if (!pool) return error("NOT_FOUND", "Pool not found", 404);
  if (pool.status !== "setup") {
    return error("POOL_NOT_IN_SETUP", "Roster changes are only allowed during setup", 403);
  }

  const membership = await db.query.poolMembers.findFirst({
    where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, user.id)),
  });
  if (!membership) return error("FORBIDDEN", "You are not a member of this pool", 403);

  const body = await request.json().catch(() => null);
  const parsed = addPlayerSchema.safeParse(body);
  if (!parsed.success) {
    return error("BAD_REQUEST", "playerId must be a positive integer", 400);
  }

  const { playerId } = parsed.data;

  const player = await db.query.nhlPlayers.findFirst({
    where: and(eq(nhlPlayers.id, playerId), eq(nhlPlayers.isActive, true)),
  });
  if (!player) return error("NOT_FOUND", "Player not found or inactive", 404);

  const settings = pool.settings;
  if (!settings) return error("INTERNAL_ERROR", "Pool has no settings configured", 500);

  // Count my current slots
  const slotCounts = await db
    .select({ slot: rosterEntries.rosterSlot, total: count() })
    .from(rosterEntries)
    .where(and(eq(rosterEntries.poolId, poolId), eq(rosterEntries.userId, user.id)))
    .groupBy(rosterEntries.rosterSlot);

  const slotMap = Object.fromEntries(
    slotCounts.map((s) => [s.slot, Number(s.total)])
  );
  const myF  = slotMap["F"]  ?? 0;
  const myD  = slotMap["D"]  ?? 0;
  const myG  = slotMap["G"]  ?? 0;
  const myWC = slotMap["WC"] ?? 0;
  const myTotal = myF + myD + myG + myWC;

  if (myTotal >= settings.rosterSize) {
    return error("ROSTER_FULL", "Your roster is full", 409);
  }

  // Assign slot based on position group, falling back to wildcard
  let rosterSlot: string;
  if (player.positionGroup === "forward") {
    if      (myF  < settings.maxForwards)  rosterSlot = "F";
    else if (myWC < settings.maxWildcards) rosterSlot = "WC";
    else return error("SLOT_FULL", "No forward or wildcard slots remaining", 409);
  } else if (player.positionGroup === "defenseman") {
    if      (myD  < settings.maxDefensemen) rosterSlot = "D";
    else if (myWC < settings.maxWildcards)  rosterSlot = "WC";
    else return error("SLOT_FULL", "No defenseman or wildcard slots remaining", 409);
  } else if (player.positionGroup === "goalie") {
    if      (myG  < settings.maxGoalies)   rosterSlot = "G";
    else if (myWC < settings.maxWildcards) rosterSlot = "WC";
    else return error("SLOT_FULL", "No goalie or wildcard slots remaining", 409);
  } else {
    return error("BAD_REQUEST", "Unknown player position group", 400);
  }

  try {
    const [entry] = await db
      .insert(rosterEntries)
      .values({ poolId, userId: user.id, playerId, rosterSlot })
      .returning();
    return success(entry, 201);
  } catch (err: unknown) {
    if (isUniqueConstraintError(err)) {
      return error("PLAYER_TAKEN", "This player is already on a roster in this pool", 409);
    }
    throw err;
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === "23505" || e.cause?.code === "23505";
}
