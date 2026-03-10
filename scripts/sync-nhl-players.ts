import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { register } from "tsconfig-paths";
register({ baseUrl: ".", paths: { "@/*": ["./src/*"] } });

import { syncPlayers } from "@/lib/nhl/sync-players";

async function main() {
  console.log("Starting player sync (includes team sync)...");
  const result = await syncPlayers();
  console.log(`Done. Synced ${result.teams} teams, ${result.players} players.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Player sync failed:");
  console.error("Message:", err.message);
  if (err.cause) console.error("Cause:", err.cause);
  console.error("Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
  process.exit(1);
});
