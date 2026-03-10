import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { register } from "tsconfig-paths";
register({ baseUrl: ".", paths: { "@/*": ["./src/*"] } });

import { syncStats } from "@/lib/nhl/sync-stats";

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

async function main() {
  const dateStr = process.argv[2] || getYesterday();
  console.log(`Syncing stats for ${dateStr}...`);

  const result = await syncStats(dateStr);

  console.log(`Done.`);
  console.log(`  Games found: ${result.gamesFound}`);
  console.log(`  Games processed: ${result.gamesProcessed}`);
  console.log(`  Stat rows upserted: ${result.statsInserted}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Stat sync failed:", err);
  process.exit(1);
});
