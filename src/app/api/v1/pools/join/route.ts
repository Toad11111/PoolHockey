import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pools, poolMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth/session";
import { success, error } from "@/lib/utils/api-response";
import { z } from "zod/v4";

const schema = z.object({
  inviteCode: z.string().min(1),
});

/**
 * POST /api/v1/pools/join
 * Join a pool using only its invite code.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return error("BAD_REQUEST", "inviteCode is required", 400);
  }

  const { inviteCode } = parsed.data;

  const pool = await db.query.pools.findFirst({
    where: eq(pools.inviteCode, inviteCode),
  });

  if (!pool) return error("NOT_FOUND", "Invalid invite code", 404);

  if (pool.status !== "setup") {
    return error("POOL_NOT_OPEN", "This pool is no longer accepting new members", 400);
  }

  const existing = await db.query.poolMembers.findFirst({
    where: and(eq(poolMembers.poolId, pool.id), eq(poolMembers.userId, user.id)),
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
