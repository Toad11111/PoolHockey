"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerRow, SLOT_STYLE } from "./player-row";
import type { PlayerRowData } from "./player-row";

// ── Types ──────────────────────────────────────────────────────────────────

export type RosterEntryData = {
  id: string;
  userId: string;
  playerId: number;
  rosterSlot: string;
  addedAt: string;
  playerFullName: string;
  playerPosition: string;
  playerPositionGroup: string;
  playerTeamId: string | null;
  playerHeadshotUrl: string | null;
};

type Settings = {
  rosterSize: number;
  maxForwards: number;
  maxDefensemen: number;
  maxGoalies: number;
  maxWildcards: number;
};

type SearchPlayer = {
  id: number;
  fullName: string;
  position: string;
  positionGroup: string;
  teamId: string | null;
  teamName: string | null;
};

type PointsMode = "date" | "total";

type Props = {
  poolId: string;
  poolStatus: string;
  currentUserId: string;
  selectedMemberId: string;
  selectedMemberName: string;
  allRosters: Record<string, RosterEntryData[]>;
  selectedDatePoints: Record<string, Record<string, number>>;
  poolTotalPoints: Record<string, Record<string, number>>;
  playerStats: Record<string, Record<string, { goals: number; assists: number }>>;
  selectedDate: string | null;
  activeDateIds: number[];
  settings: Settings;
};

// ── Slot chip ─────────────────────────────────────────────────────────────

function SlotChip({ slot, count, max }: { slot: string; count: number; max: number }) {
  const style = SLOT_STYLE[slot];
  if (!style) return null;
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs", style.cls)}>
      {slot} {count}/{max}
    </span>
  );
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ── Main component ─────────────────────────────────────────────────────────

export function RosterView({
  poolId,
  poolStatus,
  currentUserId,
  selectedMemberId,
  selectedMemberName,
  allRosters,
  selectedDatePoints,
  poolTotalPoints,
  playerStats,
  selectedDate,
  activeDateIds,
  settings,
}: Props) {
  const [myEntries, setMyEntries] = useState<RosterEntryData[]>(
    allRosters[currentUserId] ?? []
  );
  const [pointsMode, setPointsMode] = useState<PointsMode>("date");
  const [loadingMyRoster, setLoadingMyRoster] = useState(false);

  // Search / add (my roster, setup only)
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchPlayer[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMyRoster = selectedMemberId === currentUserId;
  const canEdit = isMyRoster && poolStatus === "setup";
  const hasScoring = selectedDate !== null;
  const activeDateSet = new Set(activeDateIds);

  const displayedEntries: RosterEntryData[] = isMyRoster
    ? myEntries
    : (allRosters[selectedMemberId] ?? []);

  const slotMap = myEntries.reduce<Record<string, number>>((acc, e) => {
    acc[e.rosterSlot] = (acc[e.rosterSlot] ?? 0) + 1;
    return acc;
  }, {});

  const dateLabel = selectedDate ? formatDateLabel(selectedDate) : null;

  // ── Helpers ─────────────────────────────────────────────────────────────

  function getPoints(entry: RosterEntryData): number | undefined {
    if (!hasScoring) return undefined;
    const map = pointsMode === "date" ? selectedDatePoints : poolTotalPoints;
    return map[entry.userId]?.[String(entry.playerId)] ?? 0;
  }

  function getStats(
    entry: RosterEntryData
  ): { goals: number; assists: number } | undefined {
    if (pointsMode !== "date" || !hasScoring) return undefined;
    if (!activeDateSet.has(entry.playerId)) return undefined;
    const s = playerStats[entry.userId]?.[String(entry.playerId)];
    return { goals: s?.goals ?? 0, assists: s?.assists ?? 0 };
  }

  function getIsActive(entry: RosterEntryData): boolean | undefined {
    if (!hasScoring || pointsMode !== "date") return undefined;
    return activeDateSet.has(entry.playerId);
  }

  // ── My roster refetch ────────────────────────────────────────────────────

  const refetchMyRoster = useCallback(async () => {
    setLoadingMyRoster(true);
    try {
      const res = await fetch(`/api/v1/pools/${poolId}/roster?userId=me`);
      const json = await res.json();
      if (json.data) setMyEntries(json.data);
    } finally {
      setLoadingMyRoster(false);
    }
  }, [poolId]);

  // ── Player search ────────────────────────────────────────────────────────

  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await fetch(
          `/api/v1/players?q=${encodeURIComponent(search.trim())}&limit=10`
        );
        const json = await res.json();
        if (json.data) setSearchResults(json.data);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Add / remove ─────────────────────────────────────────────────────────

  async function handleAdd(playerId: number) {
    setErrorMsg(null);
    setAddingId(playerId);
    try {
      const res = await fetch(`/api/v1/pools/${poolId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message ?? "Failed to add player");
        return;
      }
      setSearch("");
      setSearchResults([]);
      await refetchMyRoster();
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemove(entryId: string) {
    setErrorMsg(null);
    setRemovingId(entryId);
    try {
      const res = await fetch(`/api/v1/pools/${poolId}/roster/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error?.message ?? "Failed to remove player");
        return;
      }
      await refetchMyRoster();
    } finally {
      setRemovingId(null);
    }
  }

  const myPlayerIds = new Set(myEntries.map((e) => e.playerId));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {isMyRoster ? "My Roster" : selectedMemberName}
            </CardTitle>
            {!isMyRoster && (
              <p className="mt-0.5 text-xs text-muted-foreground">read-only</p>
            )}
          </div>

          {/* Points toggle — only when scoring data exists */}
          {hasScoring && (
            <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
              <button
                onClick={() => setPointsMode("date")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  pointsMode === "date"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {dateLabel}
              </button>
              <button
                onClick={() => setPointsMode("total")}
                className={cn(
                  "border-l border-border px-3 py-1.5 text-xs font-medium transition-colors",
                  pointsMode === "total"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Total
              </button>
            </div>
          )}
        </div>

        {/* Slot chips — my roster only */}
        {isMyRoster && (
          <div className="flex flex-wrap gap-1.5">
            <SlotChip slot="F"  count={slotMap["F"]  ?? 0} max={settings.maxForwards} />
            <SlotChip slot="D"  count={slotMap["D"]  ?? 0} max={settings.maxDefensemen} />
            <SlotChip slot="G"  count={slotMap["G"]  ?? 0} max={settings.maxGoalies} />
            {settings.maxWildcards > 0 && (
              <SlotChip slot="WC" count={slotMap["WC"] ?? 0} max={settings.maxWildcards} />
            )}
            <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {myEntries.length}/{settings.rosterSize} total
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMsg && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMsg}
          </p>
        )}

        {loadingMyRoster ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : displayedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isMyRoster
              ? "No players on your roster yet."
              : "This member has no players yet."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {displayedEntries.map((entry) => {
              const rowData: PlayerRowData = {
                id: entry.id,
                playerId: entry.playerId,
                playerFullName: entry.playerFullName,
                playerPosition: entry.playerPosition,
                playerTeamId: entry.playerTeamId,
                playerHeadshotUrl: entry.playerHeadshotUrl,
                rosterSlot: entry.rosterSlot,
              };
              return (
                <PlayerRow
                  key={entry.id}
                  entry={rowData}
                  points={getPoints(entry)}
                  stats={getStats(entry)}
                  isActive={getIsActive(entry)}
                  acquiredDate={entry.addedAt}
                  pointsMode={pointsMode}
                  onRemove={canEdit ? handleRemove : undefined}
                  removing={removingId === entry.id}
                />
              );
            })}
          </div>
        )}

        {/* Add players — my roster, setup phase only */}
        {canEdit && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Add Players
            </p>
            <div className="relative">
              <Input
                placeholder="Search players… (min 2 characters)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setErrorMsg(null);
                }}
              />
              {loadingSearch && (
                <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="rounded-md border">
                {searchResults.map((p) => {
                  const alreadyAdded = myPlayerIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between px-3 py-2",
                        "[&:not(:last-child)]:border-b"
                      )}
                    >
                      <div>
                        <span className="text-sm font-medium">{p.fullName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.position}
                          {p.teamId ? ` · ${p.teamId}` : ""}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={alreadyAdded || addingId === p.id}
                        onClick={() => handleAdd(p.id)}
                      >
                        {addingId === p.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <UserPlus className="size-4" />
                        )}
                        {alreadyAdded ? "Added" : "Add"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
