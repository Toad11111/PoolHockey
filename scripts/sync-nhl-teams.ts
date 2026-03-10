import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { register } from "tsconfig-paths";
register({ baseUrl: ".", paths: { "@/*": ["./src/*"] } });

import { syncTeams } from "@/lib/nhl/sync-teams";

async function main() {
  console.log("Starting team sync...");
  const count = await syncTeams();
  console.log(`Done. Synced ${count} teams.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Team sync failed:", err);
  process.exit(1);
});
