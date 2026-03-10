import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pools, poolMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth/session";
import { joinPoolSchema } from "@/lib/pools/validation";
import { success, error } from "@/lib/utils/api-response";

/**
 * POST /api/v1/pools/:poolId/join
 * Join a pool using an invite code. Pool must be in "setup" status.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const { poolId } = await params;

  const body = await request.json();
  const parsed = joinPoolSchema.safeParse(body);
  if (!parsed.success) {
    return error("VALIDATION_ERROR", "Invite code is required", 400);
  }

  const { inviteCode } = parsed.data;

  // Look up pool and verify invite code
  const pool = await db.query.pools.findFirst({
    where: eq(pools.id, poolId),
  });

  if (!pool) return error("NOT_FOUND", "Pool not found", 404);

  if (pool.inviteCode !== inviteCode) {
    return error("INVALID_CODE", "Invalid invite code", 403);
  }

  if (pool.status !== "setup") {
    return error("POOL_NOT_OPEN", "This pool is no longer accepting new members", 400);
  }

  // Check not already a member
  const existing = await db.query.poolMembers.findFirst({
    where: and(
      eq(poolMembers.poolId, poolId),
      eq(poolMembers.userId, user.id)
    ),
  });
  if (existing) {
    return error("ALREADY_MEMBER", "You are already a member of this pool", 409);
  }

  await db.insert(poolMembers).values({
    poolId: pool.id,
    userId: user.id,
    role: "member",
  });

  return success({ poolId: pool.id, poolName: pool.name });
}
