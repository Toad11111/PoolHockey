import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { pools } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Generate a unique 8-character invite code.
 * Retries up to 5 times on collision (extremely unlikely with nanoid).
 */
export async function generateInviteCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = nanoid(8);
    const existing = await db.query.pools.findFirst({
      where: eq(pools.inviteCode, code),
    });
    if (!existing) return code;
  }
  throw new Error("Failed to generate a unique invite code after 5 attempts");
}
