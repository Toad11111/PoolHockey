import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type TopPerformer = {
  userId: string;
  username: string;
  displayName: string | null;
  points: string;
};

type Props = {
  rows: TopPerformer[];
  gameDate: string | null;
};

export function TopPerformersCard({ rows, gameDate }: Props) {
  if (rows.length === 0) return null;

  const formatted = gameDate
    ? new Date(gameDate + "T12:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Top Performers{formatted ? ` · ${formatted}` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {rows.map((row, i) => (
            <div
              key={row.userId}
              className="flex items-center gap-3 px-5 py-2.5"
            >
              <span className="w-4 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <span className="flex-1 truncate text-sm">
                {row.displayName ?? row.username}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  @{row.username}
                </span>
              </span>
              <span className="text-sm font-bold tabular-nums text-primary">
                {Number(row.points).toFixed(1)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  pts
                </span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
