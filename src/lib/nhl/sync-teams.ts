import { db } from "@/lib/db";
import { nhlTeams } from "@/lib/db/schema";
import { fetchNHL } from "./client";
import type { StandingsResponse } from "./types";

/**
 * Fetch all NHL teams from standings and upsert into nhl_teams.
 * Uses team abbreviation as the primary key.
 */
export async function syncTeams(): Promise<number> {
  const data = await fetchNHL<StandingsResponse>("/v1/standings/now");

  // Deduplicate by abbreviation (standings may list teams multiple times)
  const seen = new Set<string>();
  const teams: { id: string; name: string; logoUrl: string }[] = [];

  for (const entry of data.standings) {
    const abbrev = entry.teamAbbrev.default;
    if (seen.has(abbrev)) continue;
    seen.add(abbrev);

    teams.push({
      id: abbrev,
      name: entry.teamName.default,
      logoUrl: entry.teamLogo,
    });
  }

  // Upsert all teams
  for (const team of teams) {
    await db
      .insert(nhlTeams)
      .values({
        id: team.id,
        name: team.name,
        logoUrl: team.logoUrl,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: nhlTeams.id,
        set: {
          name: team.name,
          logoUrl: team.logoUrl,
          updatedAt: new Date(),
        },
      });
  }

  return teams.length;
}
