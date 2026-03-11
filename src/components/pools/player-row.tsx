"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

export type PlayerRowData = {
  id: string;
  playerId: number;
  playerFullName: string;
  playerPosition: string;
  playerPositionGroup?: string;
  playerTeamId: string | null;
  playerHeadshotUrl: string | null;
  rosterSlot: string;
};

export const SLOT_STYLE: Record<string, { label: string; cls: string }> = {
  F:  { label: "F",  cls: "border-orange-500/20 bg-orange-500/10 text-orange-400" },
  D:  { label: "D",  cls: "border-blue-500/20 bg-blue-500/10 text-blue-400" },
  G:  { label: "G",  cls: "border-amber-500/20 bg-amber-500/10 text-amber-400" },
  WC: { label: "WC", cls: "border-purple-500/20 bg-purple-500/10 text-purple-400" },
};

// ── Shared sub-components (also used by TopPlayersCard) ───────────────────

export function PlayerHeadshot({
  url,
  name,
  size = "md",
}: {
  url: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const [errored, setErrored] = useState(false);
  const parts = (name ?? "").trim().split(/\s+/);
  const initial =
    (parts.length > 1 ? parts[parts.length - 1] : parts[0])?.[0]?.toUpperCase() ?? "?";
  const dim = size === "sm" ? "size-7" : "size-9";

  if (url && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={cn(dim, "shrink-0 rounded-full bg-muted object-cover")}
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <div
      className={cn(
        dim,
        "shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground"
      )}
    >
      {initial}
    </div>
  );
}

export function TeamLogo({ teamId }: { teamId: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://assets.nhle.com/logos/nhl/svg/${teamId}_light.svg`}
      alt=""
      className="size-3.5 shrink-0 object-contain"
      onError={() => setErrored(true)}
    />
  );
}

function formatAcquiredDate(iso: string): string {
  const datePart = iso.slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ── Main component ─────────────────────────────────────────────────────────

export type GameStatus = "live" | "played" | "later" | "scratched" | null;

type Props = {
  entry: PlayerRowData;
  points?: number;                              // undefined = no scoring context
  stats?: { goals: number; assists: number; wins?: number; saves?: number; goalsAgainst?: number; shutouts?: number };
  gameStatus?: GameStatus;                      // team game state for selected date
  acquiredDate?: string;                        // ISO timestamp
  pointsMode?: "date" | "total";
  onRemove?: (id: string) => void;
  removing?: boolean;
};

export function PlayerRow({
  entry,
  points,
  stats,
  gameStatus,
  acquiredDate,
  pointsMode,
  onRemove,
  removing,
}: Props) {
  const slot = SLOT_STYLE[entry.rosterSlot] ?? {
    label: entry.rosterSlot,
    cls: "border-border bg-muted text-muted-foreground",
  };

  const hasScoring = points !== undefined;
  const totalMode = pointsMode === "total";
  const isGoalie = entry.playerPositionGroup === "goalie";

  // Scoring segment — points value gets stronger emphasis via a child span
  let scoringNode: React.ReactNode = null;
  if (hasScoring) {
    const ptVal = (points ?? 0).toFixed(1);
    const pts = <span className="font-semibold text-foreground">{ptVal} pts{totalMode ? " total" : ""}</span>;
    if (isGoalie) {
      if (totalMode) {
        scoringNode = pts;
      } else {
        const w  = stats?.wins ?? 0;
        const sv = stats?.saves ?? 0;
        const ga = stats?.goalsAgainst ?? 0;
        const svPct = sv + ga > 0 ? (sv / (sv + ga)).toFixed(3).replace(/^0/, "") : "---";
        const so = stats?.shutouts ?? 0;
        scoringNode = <>{w}W · {svPct} SV% · {so}SO · {pts}</>;
      }
    } else {
      const g = stats?.goals ?? 0;
      const a = stats?.assists ?? 0;
      scoringNode = <>{g}G · {a}A · {pts}</>;
    }
  }

  const profileHref = `/players/${entry.playerId}`;

  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link href={profileHref} className="shrink-0">
        <PlayerHeadshot url={entry.playerHeadshotUrl} name={entry.playerFullName} />
      </Link>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <Link href={profileHref} className="hover:underline">
          <p className="truncate text-sm font-medium">{entry.playerFullName}</p>
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{entry.playerPosition}</span>
          {entry.playerTeamId && (
            <>
              <span>·</span>
              <TeamLogo teamId={entry.playerTeamId} />
              <span>{entry.playerTeamId}</span>
            </>
          )}
        </div>
        {(scoringNode || acquiredDate) && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {scoringNode}
            {scoringNode && acquiredDate && " · "}
            {acquiredDate && `Added ${formatAcquiredDate(acquiredDate)}`}
          </p>
        )}
      </div>

      {/* Right cluster: game status badge, slot badge, remove button */}
      <div className="flex items-center gap-1.5 shrink-0">
        {gameStatus === "live" ? (
          <span className="flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
            <span className="size-1.5 rounded-full bg-red-400 animate-pulse" />
            Live
          </span>
        ) : gameStatus === "played" ? (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            Played
          </span>
        ) : gameStatus === "later" ? (
          <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
            Team plays later
          </span>
        ) : gameStatus === "scratched" ? (
          <span className="rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            Scratched
          </span>
        ) : null}

        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs font-medium",
            slot.cls
          )}
        >
          {slot.label}
        </span>

        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            disabled={removing}
            onClick={() => onRemove(entry.id)}
            aria-label={`Remove ${entry.playerFullName}`}
            className="size-7"
          >
            {removing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
