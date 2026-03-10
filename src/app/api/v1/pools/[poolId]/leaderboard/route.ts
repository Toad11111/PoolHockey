import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { poolMembers, totalScores, users } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getUser } from "@/lib/auth/session";
import { success, error } from "@/lib/utils/api-response";

type Params = { params: Promise<{ poolId: string }> };

/**
 * GET /api/v1/pools/:poolId/leaderboard
 * Returns total scores for all members, ranked by points descending.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const { poolId } = await params;

  const membership = await db.query.poolMembers.findFirst({
    where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, user.id)),
  });
  if (!membership) return error("FORBIDDEN", "You are not a member of this pool", 403);

  const rows = await db
    .select({
      userId:      totalScores.userId,
      totalPoints: totalScores.totalPoints,
      lastUpdated: totalScores.lastUpdated,
      username:    users.username,
      displayName: users.displayName,
    })
    .from(totalScores)
    .innerJoin(users, eq(totalScores.userId, users.id))
    .where(eq(totalScores.poolId, poolId))
    .orderBy(desc(totalScores.totalPoints));

  const ranked = rows.map((row, i) => ({ rank: i + 1, ...row }));

  return success(ranked);
}
