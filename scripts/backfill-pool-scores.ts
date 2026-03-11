/**
 * Recalculates pool scores for all pools across all dates that have NHL stats.
 * Run this after fixing the add-date scoring bug to correct any retroactively
 * miscounted points in existing daily_scores and total_scores rows.
 *
 * Usage:
 *   npx tsx scripts/backfill-pool-scores.ts              # all pools, all scored dates
 *   npx tsx scripts/backfill-pool-scores.ts <poolId>     # specific pool only
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { register } from "tsconfig-paths";
register({ baseUrl: ".", paths: { "@/*": ["./src/*"] } });

import { db } from "@/lib/db";
import { pools, nhlGameStats } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { calculatePoolScores } from "@/lib/scoring/engine";

async function main() {
  const targetPoolId = process.argv[2] ?? null;

  // All pools (or just the specified one)
  const allPools = await db
    .select({ id: pools.id, name: pools.name })
    .from(pools)
    .where(targetPoolId ? eq(pools.id, targetPoolId) : sql`1=1`);

  if (allPools.length === 0) {
    console.log("No pools found.");
    process.exit(0);
  }

  // All distinct dates that have NHL stats
  const dateRows = await db.execute<{ game_date: string }>(
    sql`SELECT DISTINCT game_date FROM nhl_game_stats ORDER BY game_date`
  );
  const dates = dateRows.map((r) => r.game_date);

  if (dates.length === 0) {
    console.log("No game dates found in nhl_game_stats.");
    process.exit(0);
  }

  console.log(`\nBackfilling scores for ${allPools.length} pool(s) × ${dates.length} date(s)\n`);

  let totalWritten = 0;
  let errors = 0;

  for (const pool of allPools) {
    console.log(`Pool: ${pool.name} (${pool.id})`);

    for (const date of dates) {
      process.stdout.write(`  ${date}  `);
      try {
        const result = await calculatePoolScores(pool.id, date);
        process.stdout.write(`${result.scoresWritten} member(s) scored\n`);
        totalWritten += result.scoresWritten;
      } catch (err) {
        process.stdout.write(`ERROR: ${(err as Error).message}\n`);
        errors++;
      }
    }

    console.log();
  }

  console.log("─── Done ───────────────────────────────────");
  console.log(`  Score rows written : ${totalWritten}`);
  if (errors > 0) console.log(`  Errors             : ${errors}`);
  console.log("────────────────────────────────────────────\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
