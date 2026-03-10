"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type StandingsMember = {
  userId: string;
  username: string;
  displayName: string | null;
  role: string;
  totalPoints: string;
};

type Props = {
  members: StandingsMember[];
  currentUserId: string;
  selectedMemberId: string;
  onSelect: (userId: string) => void;
  poolStatus: string;
};

const RANK_COLORS: Record<number, string> = {
  1: "text-amber-400",
  2: "text-zinc-400",
  3: "text-amber-700",
};

export function GlobalStandingsCard({
  members,
  currentUserId,
  selectedMemberId,
  onSelect,
  poolStatus,
}: Props) {
  const showPoints = poolStatus !== "setup";

  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Standings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {members.map((m, i) => {
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
              {showPoints ? (
                <span
                  className={cn(
                    "w-5 shrink-0 text-center text-xs font-bold tabular-nums",
                    RANK_COLORS[rank] ?? "text-muted-foreground"
                  )}
                >
                  {rank}
                </span>
              ) : (
                <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">·</span>
              )}

              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm font-medium">
                  {m.displayName ?? m.username}
                  {isMe && (
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                      you
                    </span>
                  )}
                </span>
                {m.role === "host" && (
                  <span className="text-[10px] text-muted-foreground">host</span>
                )}
              </span>

              {showPoints ? (
                <span className="text-sm font-bold tabular-nums text-primary shrink-0">
                  {Number(m.totalPoints).toFixed(1)}
                  <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">pts</span>
                </span>
              ) : isSelected ? (
                <span className="text-[10px] text-primary shrink-0">viewing</span>
              ) : null}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
