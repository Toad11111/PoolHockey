import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pools, poolMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth/session";
import { success, error } from "@/lib/utils/api-response";

/**
 * POST /api/v1/pools/:poolId/activate
 * Move pool from "setup" to "active". Host only.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const { poolId } = await params;

  // Verify caller is the host
  const membership = await db.query.poolMembers.findFirst({
    where: and(
      eq(poolMembers.poolId, poolId),
      eq(poolMembers.userId, user.id)
    ),
  });

  if (!membership) return error("FORBIDDEN", "You are not a member of this pool", 403);
  if (membership.role !== "host") return error("FORBIDDEN", "Only the host can activate this pool", 403);

  const pool = await db.query.pools.findFirst({
    where: eq(pools.id, poolId),
  });

  if (!pool) return error("NOT_FOUND", "Pool not found", 404);
  if (pool.status !== "setup") {
    return error("INVALID_STATUS", `Pool is already ${pool.status}`, 400);
  }

  const [updated] = await db
    .update(pools)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(pools.id, poolId))
    .returning();

  return success(updated);
}
