import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { nhlPlayers, nhlTeams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { fetchNHL } from "@/lib/nhl/client";
import { PlayerHeadshot, TeamLogo } from "@/components/pools/player-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── NHL API types (loosely typed for safety) ─────────────────────────────

type NHLSeasonTotal = {
  season?: number;
  gameTypeId?: number;
  leagueAbbrev?: string;
  teamName?: { default?: string };
  goals?: number;
  assists?: number;
  points?: number;
  gamesPlayed?: number;
};

type NHLLanding = {
  seasonTotals?: NHLSeasonTotal[];
};

// ── DB row types ──────────────────────────────────────────────────────────

type SeasonStatRow = {
  goals: string;
  assists: string;
  points: string;
  games_played: string;
};

type GameStatRow = {
  game_date: string;
  goals: string;
  assists: string;
  points: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────

function formatSeason(season: number): string {
  const start = String(season).slice(0, 4);
  const end = String(season).slice(6, 8);
  return `${start}-${end}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId: playerIdStr } = await params;
  const playerId = parseInt(playerIdStr, 10);
  if (isNaN(playerId)) notFound();

  // 1. Player info
  const playerRows = await db
    .select({
      id:            nhlPlayers.id,
      fullName:      nhlPlayers.fullName,
      position:      nhlPlayers.position,
      positionGroup: nhlPlayers.positionGroup,
      teamId:        nhlPlayers.teamId,
      teamName:      nhlTeams.name,
      headshotUrl:   nhlPlayers.headshotUrl,
      isActive:      nhlPlayers.isActive,
    })
    .from(nhlPlayers)
    .leftJoin(nhlTeams, eq(nhlPlayers.teamId, nhlTeams.id))
    .where(eq(nhlPlayers.id, playerId))
    .limit(1);

  if (playerRows.length === 0) notFound();
  const player = playerRows[0];

  // 2 + 3. This-season totals + last 10 games (parallel, from our DB)
  const [thisSeasonRows, last10Rows, landing] = await Promise.all([
    db.execute(
      sql`
        SELECT
          COALESCE(SUM(CASE WHEN stat_key = 'goals'   THEN stat_value::numeric ELSE 0 END), 0) AS goals,
          COALESCE(SUM(CASE WHEN stat_key = 'assists'  THEN stat_value::numeric ELSE 0 END), 0) AS assists,
          COALESCE(SUM(CASE WHEN stat_key = 'points'   THEN stat_value::numeric ELSE 0 END), 0) AS points,
          COUNT(DISTINCT game_id) AS games_played
        FROM nhl_game_stats
        WHERE player_id = ${playerId}
      `
    ),

    db.execute(
      sql`
        SELECT
          game_date,
          COALESCE(SUM(CASE WHEN stat_key = 'goals'   THEN stat_value::numeric ELSE 0 END), 0) AS goals,
          COALESCE(SUM(CASE WHEN stat_key = 'assists'  THEN stat_value::numeric ELSE 0 END), 0) AS assists,
          COALESCE(SUM(CASE WHEN stat_key = 'points'   THEN stat_value::numeric ELSE 0 END), 0) AS points
        FROM nhl_game_stats
        WHERE player_id = ${playerId}
        GROUP BY game_date
        ORDER BY game_date DESC
        LIMIT 10
      `
    ),

    // 4. NHL API career season totals
    fetchNHL<NHLLanding>(`/v1/player/${playerId}/landing`).catch(() => null),
  ]);

  const thisSeason = (thisSeasonRows as unknown as SeasonStatRow[])[0] ?? {
    goals: "0", assists: "0", points: "0", games_played: "0",
  };
  const last10Games = last10Rows as unknown as GameStatRow[];

  // Deduplicate by season (mid-season trades produce two entries for the same season),
  // summing stats across teams. Then take the 5 most recent.
  const seasonMap = new Map<number, NHLSeasonTotal>();
  for (const s of (landing?.seasonTotals ?? []).filter(
    (s) => s.gameTypeId === 2 && s.leagueAbbrev === "NHL"
  )) {
    const key = s.season ?? 0;
    const ex = seasonMap.get(key);
    if (ex) {
      seasonMap.set(key, {
        season:      key,
        gameTypeId:  2,
        leagueAbbrev: "NHL",
        teamName:    undefined, // multiple teams
        goals:       (ex.goals       ?? 0) + (s.goals       ?? 0),
        assists:     (ex.assists     ?? 0) + (s.assists     ?? 0),
        points:      (ex.points      ?? 0) + (s.points      ?? 0),
        gamesPlayed: (ex.gamesPlayed ?? 0) + (s.gamesPlayed ?? 0),
      });
    } else {
      seasonMap.set(key, { ...s });
    }
  }
  const last5Seasons: NHLSeasonTotal[] = [...seasonMap.values()]
    .sort((a, b) => (b.season ?? 0) - (a.season ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5">
        <PlayerHeadshot url={player.headshotUrl} name={player.fullName} size="md" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{player.fullName}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{player.position}</span>
            {player.teamId && (
              <>
                <span>·</span>
                <TeamLogo teamId={player.teamId} />
                <span>{player.teamName ?? player.teamId}</span>
              </>
            )}
            {!player.isActive && (
              <span className="rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                Inactive
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── This Season ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            This Season
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { label: "GP",  value: thisSeason.games_played },
              { label: "G",   value: thisSeason.goals },
              { label: "A",   value: thisSeason.assists },
              { label: "PTS", value: thisSeason.points },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xl font-bold tabular-nums">{Number(value)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Last 10 Games ───────────────────────────────────────────────── */}
      {last10Games.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Last {last10Games.length} Games
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-right font-medium">G</th>
                  <th className="px-4 py-2 text-right font-medium">A</th>
                  <th className="px-5 py-2 text-right font-medium">PTS</th>
                </tr>
              </thead>
              <tbody>
                {last10Games.map((g) => (
                  <tr
                    key={g.game_date}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {formatDate(g.game_date)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {Number(g.goals)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {Number(g.assists)}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-semibold">
                      {Number(g.points)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Last 5 Seasons ──────────────────────────────────────────────── */}
      {last5Seasons.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Career (Last {last5Seasons.length} Seasons)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-5 py-2 text-left font-medium">Season</th>
                  <th className="px-4 py-2 text-right font-medium">GP</th>
                  <th className="px-4 py-2 text-right font-medium">G</th>
                  <th className="px-4 py-2 text-right font-medium">A</th>
                  <th className="px-5 py-2 text-right font-medium">PTS</th>
                </tr>
              </thead>
              <tbody>
                {last5Seasons.map((s) => (
                  <tr
                    key={s.season}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {s.season ? formatSeason(s.season) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {s.gamesPlayed ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {s.goals ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {s.assists ?? 0}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-semibold">
                      {s.points ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
