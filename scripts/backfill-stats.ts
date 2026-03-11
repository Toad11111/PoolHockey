/**
 * Backfills NHL game stats from the start of the current season to yesterday.
 *
 * Usage:
 *   npx tsx scripts/backfill-stats.ts                   # Oct 1 → yesterday
 *   npx tsx scripts/backfill-stats.ts 2025-12-01        # custom start date
 *   npx tsx scripts/backfill-stats.ts 2025-12-01 2026-01-31  # custom range
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { register } from "tsconfig-paths";
register({ baseUrl: ".", paths: { "@/*": ["./src/*"] } });

import { syncStats } from "@/lib/nhl/sync-stats";

// 2025-26 season opener — start one day early to be safe
const SEASON_START = "2025-10-01";

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

async function main() {
  const startDate = process.argv[2] ?? SEASON_START;
  const endDate   = process.argv[3] ?? yesterday();

  if (startDate > endDate) {
    console.error(`Start date (${startDate}) is after end date (${endDate}). Nothing to do.`);
    process.exit(0);
  }

  const total = daysBetween(startDate, endDate);
  console.log(`\nBackfilling stats from ${startDate} → ${endDate} (${total} days)\n`);

  let current    = startDate;
  let daysDone   = 0;
  let gamesTotal = 0;
  let statsTotal = 0;
  let errors     = 0;

  while (current <= endDate) {
    process.stdout.write(`[${String(daysDone + 1).padStart(3)}/${total}] ${current}  `);

    try {
      const result = await syncStats(current);

      if (result.gamesFound === 0) {
        process.stdout.write("no games\n");
      } else if (result.gamesProcessed === 0) {
        process.stdout.write(`${result.gamesFound} game(s) found, none completed yet\n`);
      } else {
        process.stdout.write(
          `${result.gamesProcessed}/${result.gamesFound} games · ${result.statsInserted} stat rows\n`
        );
        gamesTotal += result.gamesProcessed;
        statsTotal += result.statsInserted;
      }
    } catch (err) {
      process.stdout.write(`ERROR: ${(err as Error).message}\n`);
      errors++;
    }

    daysDone++;
    current = addDays(current, 1);

    // Polite delay between dates — 400 ms keeps us well within NHL API rate limits
    if (current <= endDate) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  console.log(`\n─── Done ───────────────────────────────────`);
  console.log(`  Dates processed : ${daysDone}`);
  console.log(`  Games synced    : ${gamesTotal}`);
  console.log(`  Stat rows saved : ${statsTotal}`);
  if (errors > 0) console.log(`  Errors          : ${errors}`);
  console.log(`────────────────────────────────────────────\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
