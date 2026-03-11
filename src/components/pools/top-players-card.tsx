"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerHeadshot, TeamLogo } from "./player-row";

export type TopPlayer = {
  playerId: number;
  fullName: string;
  position: string;
  positionGroup: string;
  teamId: string | null;
  headshotUrl: string | null;
  fantasyPoints: number;
  goals: number;
  assists: number;
  wins: number;
  shutouts: number;
  saves: number;
};

type Props = {
  players: TopPlayer[];
  selectedDate: string;
  today: string;
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Position-aware stat line: skaters show G/A, goalies show W/SO/SV */
function statLine(p: TopPlayer): React.ReactNode {
  if (p.positionGroup === "goalie") {
    if (p.shutouts > 0) {
      return <span className="text-emerald-400">Won with shutout</span>;
    }
    if (p.wins > 0) {
      return <span className="text-emerald-400">{p.wins}W</span>;
    }
    return <span className="text-sky-400">{p.saves} SV</span>;
  }
  return (
    <>
      <span className="text-emerald-400">{p.goals}G</span>
      <span className="mx-0.5">·</span>
      <span className="text-sky-400">{p.assists}A</span>
    </>
  );
}

export function TopPlayersCard({ players, selectedDate, today }: Props) {
  const isToday = selectedDate === today;
  const title = isToday
    ? "Top pool performers tonight"
    : `Top Players · ${formatDate(selectedDate)}`;

  if (players.length === 0) {
    if (!isToday) return null;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No stats yet — check back when tonight&apos;s games are underway.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
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
            <Link href={`/players/${p.playerId}`} className="shrink-0">
              <PlayerHeadshot url={p.headshotUrl} name={p.fullName} size="sm" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/players/${p.playerId}`} className="hover:underline">
                <p className="truncate text-sm font-medium">{p.fullName}</p>
              </Link>
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
                {statLine(p)}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
