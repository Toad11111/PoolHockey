import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pools, poolMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth/session";
import { success, error } from "@/lib/utils/api-response";

/**
 * GET /api/v1/pools/:poolId
 * Returns pool details + settings + scoring rules.
 * Requires the caller to be a member of the pool.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const { poolId } = await params;

  // Verify membership
  const membership = await db.query.poolMembers.findFirst({
    where: and(
      eq(poolMembers.poolId, poolId),
      eq(poolMembers.userId, user.id)
    ),
  });
  if (!membership) return error("FORBIDDEN", "You are not a member of this pool", 403);

  const pool = await db.query.pools.findFirst({
    where: eq(pools.id, poolId),
    with: {
      settings: true,
      scoringRules: true,
    },
  });

  if (!pool) return error("NOT_FOUND", "Pool not found", 404);

  return success({ ...pool, role: membership.role });
}
