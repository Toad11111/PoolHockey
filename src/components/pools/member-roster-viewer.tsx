"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlayerRow, type PlayerRowData } from "./player-row";

type Member = {
  userId: string;
  username: string;
  displayName: string | null;
};

type Props = {
  poolId: string;
  members: Member[];
  currentUserId: string;
  activeTodayIds: number[];
};

export function MemberRosterViewer({
  poolId,
  members,
  currentUserId,
  activeTodayIds,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roster, setRoster] = useState<PlayerRowData[]>([]);
  const [loading, setLoading] = useState(false);

  const activeSet = new Set(activeTodayIds);
  const otherMembers = members.filter((m) => m.userId !== currentUserId);

  if (otherMembers.length === 0) return null;

  async function selectMember(userId: string) {
    if (userId === selectedId) {
      setSelectedId(null);
      setRoster([]);
      return;
    }
    setSelectedId(userId);
    setRoster([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/pools/${poolId}/roster?userId=${userId}`);
      const json = await res.json();
      if (json.data) setRoster(json.data);
    } finally {
      setLoading(false);
    }
  }

  const selectedMember = otherMembers.find((m) => m.userId === selectedId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Member Rosters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {otherMembers.map((m) => (
            <button
              key={m.userId}
              onClick={() => selectMember(m.userId)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selectedId === m.userId
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border/60 hover:text-foreground"
              )}
            >
              {m.displayName ?? m.username}
            </button>
          ))}
        </div>

        {selectedId && (
          <div className="border-t border-border pt-3">
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading roster…
              </div>
            ) : roster.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                {selectedMember?.displayName ?? selectedMember?.username} has no
                players yet.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {roster.map((entry) => (
                  <PlayerRow
                    key={entry.id}
                    entry={entry}
                    isActive={activeSet.has(entry.playerId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
