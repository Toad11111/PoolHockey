import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  totalPoints: string;
  lastUpdated: Date;
};

type Props = {
  rows: LeaderboardRow[];
};

const RANK_COLORS: Record<number, string> = {
  1: "text-amber-400",
  2: "text-zinc-400",
  3: "text-amber-700",
};

export function LeaderboardCard({ rows }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            No scores yet. Activate the pool and run a score calculation.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <div
                key={row.userId}
                className="flex items-center gap-4 px-5 py-3"
              >
                <span
                  className={cn(
                    "w-5 shrink-0 text-center text-xs font-bold tabular-nums",
                    RANK_COLORS[row.rank] ?? "text-muted-foreground"
                  )}
                >
                  {row.rank}
                </span>
                <span className="flex-1 truncate text-sm font-medium">
                  {row.displayName ?? row.username}
                  <span className="ml-2 text-xs text-muted-foreground">
                    @{row.username}
                  </span>
                </span>
                <span className="text-base font-bold tabular-nums text-primary">
                  {Number(row.totalPoints).toFixed(1)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    pts
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
