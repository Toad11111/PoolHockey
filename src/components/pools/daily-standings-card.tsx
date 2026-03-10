"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StandingsMember } from "./global-standings-card";

type Props = {
  members: StandingsMember[];
  dailyPointsMap: Record<string, string>;
  selectedDate: string;
  currentUserId: string;
  selectedMemberId: string;
  onSelect: (userId: string) => void;
};

const RANK_COLORS: Record<number, string> = {
  1: "text-amber-400",
  2: "text-zinc-400",
  3: "text-amber-700",
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function DailyStandingsCard({
  members,
  dailyPointsMap,
  selectedDate,
  currentUserId,
  selectedMemberId,
  onSelect,
}: Props) {
  const ranked = [...members]
    .map((m) => ({ ...m, dailyPts: Number(dailyPointsMap[m.userId] ?? "0") }))
    .filter((m) => m.dailyPts > 0)
    .sort((a, b) => b.dailyPts - a.dailyPts);

  if (ranked.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Daily · {formatDate(selectedDate)}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {ranked.map((m, i) => {
          const rank = i + 1;
          const isSelected = selectedMemberId === m.userId;
          const isMe = m.userId === currentUserId;

          return (
            <button
              key={m.userId}
              onClick={() => onSelect(m.userId)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                "border-b border-border last:border-0",
                "hover:bg-muted/40",
                isSelected && "bg-primary/5"
              )}
            >
              <span
                className={cn(
                  "w-5 shrink-0 text-center text-xs font-bold tabular-nums",
                  RANK_COLORS[rank] ?? "text-muted-foreground"
                )}
              >
                {rank}
              </span>

              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm font-medium">
                  {m.displayName ?? m.username}
                  {isMe && (
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                      you
                    </span>
                  )}
                </span>
              </span>

              <span className="text-sm font-bold tabular-nums text-primary shrink-0">
                {m.dailyPts.toFixed(1)}
                <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">pts</span>
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
