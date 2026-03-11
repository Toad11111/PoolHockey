import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { register } from "tsconfig-paths";
register({ baseUrl: ".", paths: { "@/*": ["./src/*"] } });

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const [total] = await db.execute(sql`SELECT COUNT(*) as total FROM nhl_game_stats`);
  const [dates] = await db.execute(sql`SELECT COUNT(DISTINCT game_date) as dates, MIN(game_date) as first, MAX(game_date) as last FROM nhl_game_stats`);
  const [games] = await db.execute(sql`SELECT COUNT(DISTINCT game_id) as games FROM nhl_game_stats`);
  const topDates = await db.execute(sql`
    SELECT game_date, COUNT(*) as rows
    FROM nhl_game_stats
    GROUP BY game_date
    ORDER BY game_date DESC
    LIMIT 10
  `);

  console.log("\n─── nhl_game_stats summary ──────────────────────");
  console.log(`  Stat rows       : ${total.total}`);
  console.log(`  Distinct dates  : ${dates.dates}  (${dates.first} → ${dates.last})`);
  console.log(`  Distinct games  : ${games.games}`);
  console.log("\n  Last 10 dates:");
  for (const row of topDates) {
    console.log(`    ${row.game_date}  ${String(row.rows).padStart(5)} rows`);
  }
  console.log("─────────────────────────────────────────────────\n");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
