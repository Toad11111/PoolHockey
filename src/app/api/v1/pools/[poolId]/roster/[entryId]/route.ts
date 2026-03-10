import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pools, poolMembers, rosterEntries } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth/session";
import { error } from "@/lib/utils/api-response";

type Params = { params: Promise<{ poolId: string; entryId: string }> };

/**
 * DELETE /api/v1/pools/:poolId/roster/:entryId
 * Remove a player. Caller must own the entry or be the pool host.
 * Only allowed while pool is in "setup" status.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const { poolId, entryId } = await params;

  const pool = await db.query.pools.findFirst({
    where: eq(pools.id, poolId),
  });
  if (!pool) return error("NOT_FOUND", "Pool not found", 404);
  if (pool.status !== "setup") {
    return error("POOL_NOT_IN_SETUP", "Roster changes are only allowed during setup", 403);
  }

  const membership = await db.query.poolMembers.findFirst({
    where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, user.id)),
  });
  if (!membership) return error("FORBIDDEN", "You are not a member of this pool", 403);

  const entry = await db.query.rosterEntries.findFirst({
    where: and(eq(rosterEntries.id, entryId), eq(rosterEntries.poolId, poolId)),
  });
  if (!entry) return error("NOT_FOUND", "Roster entry not found", 404);

  if (entry.userId !== user.id && membership.role !== "host") {
    return error("FORBIDDEN", "You can only remove players from your own roster", 403);
  }

  await db.delete(rosterEntries).where(eq(rosterEntries.id, entryId));

  return new Response(null, { status: 204 });
}
