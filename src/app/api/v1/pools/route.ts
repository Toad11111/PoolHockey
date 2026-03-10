import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pools, poolSettings, scoringRules, poolMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/auth/session";
import { createPoolSchema } from "@/lib/pools/validation";
import { generateInviteCode } from "@/lib/pools/invite";
import { CLASSIC_RULES } from "@/lib/pools/classic-rules";
import { getCurrentSeason } from "@/lib/pools/season";
import { success, error } from "@/lib/utils/api-response";

/**
 * GET /api/v1/pools
 * Returns all pools the current user is a member of.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const memberships = await db.query.poolMembers.findMany({
    where: eq(poolMembers.userId, user.id),
    with: { pool: true },
  });

  const result = memberships.map((m) => ({
    ...m.pool,
    role: m.role,
  }));

  return success(result);
}

/**
 * POST /api/v1/pools
 * Create a new pool. The caller becomes the host.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return error("UNAUTHORIZED", "Not authenticated", 401);

  const body = await request.json();
  const parsed = createPoolSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return error("VALIDATION_ERROR", firstError, 400);
  }

  const { name, rosterSize, maxForwards, maxDefensemen, maxGoalies, maxWildcards } =
    parsed.data;

  const inviteCode = await generateInviteCode();
  const season = getCurrentSeason();

  // Insert pool + settings + scoring rules + host membership in sequence.
  // A transaction would be ideal but Supabase session pooler doesn't support them.
  // Each insert is safe to retry individually since pool creation is user-initiated.
  const [pool] = await db
    .insert(pools)
    .values({
      hostId: user.id,
      name,
      status: "setup",
      season,
      inviteCode,
    })
    .returning();

  await db.insert(poolSettings).values({
    poolId: pool.id,
    rosterSize,
    maxForwards,
    maxDefensemen,
    maxGoalies,
    maxWildcards,
    scoringMode: "classic",
    allowTrades: false,
    allowSwaps: false,
  });

  await db.insert(scoringRules).values(
    CLASSIC_RULES.map((rule) => ({
      poolId: pool.id,
      statKey: rule.statKey,
      positionGroup: rule.positionGroup,
      pointsValue: rule.pointsValue,
      isEnabled: true,
    }))
  );

  await db.insert(poolMembers).values({
    poolId: pool.id,
    userId: user.id,
    role: "host",
  });

  return success({ ...pool, inviteCode }, 201);
}
