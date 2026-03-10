"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

export type PlayerRowData = {
  id: string;
  playerId: number;
  playerFullName: string;
  playerPosition: string;
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
  const parts = name.trim().split(/\s+/);
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

type Props = {
  entry: PlayerRowData;
  points?: number;                              // undefined = no scoring context
  stats?: { goals: number; assists: number };   // date mode only, when isActive
  isActive?: boolean;                           // had stats on selected date
  acquiredDate?: string;                        // ISO timestamp
  pointsMode?: "date" | "total";
  onRemove?: (id: string) => void;
  removing?: boolean;
};

export function PlayerRow({
  entry,
  points,
  stats,
  isActive,
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
  const dateMode = pointsMode === "date";
  const totalMode = pointsMode === "total";

  // Build the info line parts
  const infoParts: string[] = [];

  if (hasScoring && dateMode && isActive) {
    const g = stats?.goals ?? 0;
    const a = stats?.assists ?? 0;
    infoParts.push(`${points!.toFixed(1)} pts · ${g}G · ${a}A`);
  } else if (hasScoring && totalMode) {
    infoParts.push(`${points!.toFixed(1)} pts total`);
  }

  if (acquiredDate) {
    infoParts.push(`Added ${formatAcquiredDate(acquiredDate)}`);
  }

  const infoLine = infoParts.join(" · ");

  return (
    <div className="flex items-center gap-3 py-2.5">
      <PlayerHeadshot url={entry.playerHeadshotUrl} name={entry.playerFullName} />

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.playerFullName}</p>
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
        {infoLine && (
          <p className="mt-0.5 text-xs text-muted-foreground">{infoLine}</p>
        )}
      </div>

      {/* Right cluster: Active badge, slot badge, remove button */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isActive && (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            Active
          </span>
        )}

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
