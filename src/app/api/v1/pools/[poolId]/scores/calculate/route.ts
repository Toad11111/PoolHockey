import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pools, poolMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth/session";
import { success, error } from "@/lib/utils/api-response";
import { calculatePoolScores } from "@/lib/scoring/engine";
import { z } from "zod/v4";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

type Params = { params: Promise<{ poolId: string }> };

/**
 * POST /api/v1/pools/:poolId/scores/calculate
 * Trigger score calculation for a given date (defaults to yesterday).
 * Idempotent — safe to call multiple times for the same date.
 * Any pool member may trigger this.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const { poolId } = await params;

  const pool = await db.query.pools.findFirst({
    where: eq(pools.id, poolId),
  });
  if (!pool) return error("NOT_FOUND", "Pool not found", 404);
  if (pool.status !== "active") {
    return error("POOL_NOT_ACTIVE", "Scores can only be calculated for active pools", 403);
  }

  const membership = await db.query.poolMembers.findFirst({
    where: and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, user.id)),
  });
  if (!membership) return error("FORBIDDEN", "You are not a member of this pool", 403);

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return error("BAD_REQUEST", "date must be YYYY-MM-DD if provided", 400);
  }

  const gameDate = parsed.data.date ?? yesterday();
  const result = await calculatePoolScores(poolId, gameDate);

  return success({ date: gameDate, ...result });
}
