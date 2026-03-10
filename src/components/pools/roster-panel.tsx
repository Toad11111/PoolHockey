"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlayerRow, type PlayerRowData } from "./player-row";

type Settings = {
  rosterSize: number;
  maxForwards: number;
  maxDefensemen: number;
  maxGoalies: number;
  maxWildcards: number;
};

type Player = {
  id: number;
  fullName: string;
  position: string;
  positionGroup: string;
  teamId: string | null;
  teamName: string | null;
};

type Props = {
  poolId: string;
  status: string;
  settings: Settings;
  activeTodayIds?: number[];
};

export function RosterPanel({ poolId, status, settings, activeTodayIds = [] }: Props) {
  const [roster, setRoster] = useState<PlayerRowData[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canEdit = status === "setup";
  const activeSet = new Set(activeTodayIds);

  const fetchRoster = useCallback(async () => {
    setLoadingRoster(true);
    try {
      const res = await fetch(`/api/v1/pools/${poolId}/roster?userId=me`);
      const json = await res.json();
      if (json.data) setRoster(json.data);
    } finally {
      setLoadingRoster(false);
    }
  }, [poolId]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Debounced player search — fires after 300ms, min 2 chars
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
      await fetchRoster();
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
      await fetchRoster();
    } finally {
      setRemovingId(null);
    }
  }

  const slotMap = roster.reduce<Record<string, number>>((acc, e) => {
    acc[e.rosterSlot] = (acc[e.rosterSlot] ?? 0) + 1;
    return acc;
  }, {});
  const myF  = slotMap["F"]  ?? 0;
  const myD  = slotMap["D"]  ?? 0;
  const myG  = slotMap["G"]  ?? 0;
  const myWC = slotMap["WC"] ?? 0;

  const myPlayerIds = new Set(roster.map((e) => e.playerId));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My Roster</CardTitle>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-xs text-orange-400">
            F {myF}/{settings.maxForwards}
          </span>
          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs text-blue-400">
            D {myD}/{settings.maxDefensemen}
          </span>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-400">
            G {myG}/{settings.maxGoalies}
          </span>
          {settings.maxWildcards > 0 && (
            <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-xs text-purple-400">
              WC {myWC}/{settings.maxWildcards}
            </span>
          )}
          <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {roster.length}/{settings.rosterSize} total
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMsg && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMsg}
          </p>
        )}

        {loadingRoster ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading roster…
          </div>
        ) : roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No players on your roster yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {roster.map((entry) => (
              <PlayerRow
                key={entry.id}
                entry={entry}
                isActive={activeSet.has(entry.playerId)}
                onRemove={canEdit ? handleRemove : undefined}
                removing={removingId === entry.id}
              />
            ))}
          </div>
        )}

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
