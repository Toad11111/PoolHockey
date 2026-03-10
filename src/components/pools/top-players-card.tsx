"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerHeadshot, TeamLogo } from "./player-row";

export type TopPlayer = {
  playerId: number;
  fullName: string;
  position: string;
  teamId: string | null;
  headshotUrl: string | null;
  fantasyPoints: number;
  goals: number;
  assists: number;
};

type Props = {
  players: TopPlayer[];
  selectedDate: string;
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function TopPlayersCard({ players, selectedDate }: Props) {
  if (players.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Top Players · {formatDate(selectedDate)}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {players.map((p, i) => (
          <div
            key={p.playerId}
            className="flex items-center gap-3 px-5 py-2.5 border-b border-border last:border-0"
          >
            <span className="w-4 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground">
              {i + 1}
            </span>
            <PlayerHeadshot url={p.headshotUrl} name={p.fullName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.fullName}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{p.position}</span>
                {p.teamId && (
                  <>
                    <span>·</span>
                    <TeamLogo teamId={p.teamId} />
                    <span>{p.teamId}</span>
                  </>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-bold tabular-nums text-primary">
                {p.fantasyPoints.toFixed(1)}
                <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">pts</span>
              </div>
              <div className="text-xs tabular-nums text-muted-foreground">
                <span className="text-emerald-400">{p.goals}G</span>
                <span className="mx-0.5">·</span>
                <span className="text-sky-400">{p.assists}A</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
