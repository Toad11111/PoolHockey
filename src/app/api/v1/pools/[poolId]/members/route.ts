import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { poolMembers, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth/session";
import { success, error } from "@/lib/utils/api-response";

/**
 * GET /api/v1/pools/:poolId/members
 * Returns all members of a pool with their username and role.
 * Requires the caller to be a member.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const { poolId } = await params;

  // Verify caller is a member
  const membership = await db.query.poolMembers.findFirst({
    where: and(
      eq(poolMembers.poolId, poolId),
      eq(poolMembers.userId, user.id)
    ),
  });
  if (!membership) return error("FORBIDDEN", "You are not a member of this pool", 403);

  const members = await db
    .select({
      userId: poolMembers.userId,
      role: poolMembers.role,
      joinedAt: poolMembers.joinedAt,
      username: users.username,
      displayName: users.displayName,
    })
    .from(poolMembers)
    .innerJoin(users, eq(poolMembers.userId, users.id))
    .where(eq(poolMembers.poolId, poolId))
    .orderBy(poolMembers.joinedAt);

  return success(members);
}
