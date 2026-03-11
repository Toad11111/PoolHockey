"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  poolId: string;
  selectedDate: string; // YYYY-MM-DD
  today: string;        // YYYY-MM-DD — upper bound for "next"
};

/** Add `days` to a YYYY-MM-DD string, returns YYYY-MM-DD */
function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function DateNav({ poolId, selectedDate, today }: Props) {
  const router = useRouter();
  const isToday = selectedDate >= today;

  function navigate(date: string) {
    // Always use explicit date param to prevent server UTC mismatch at night
    const target = date > today ? today : date;
    console.log("[DateNav] navigate called — target:", target, "today:", today);
    router.push(`/pools/${poolId}?date=${target}`);
  }

  return (
    <div className="flex items-center gap-1">
      {/* Prev day */}
      <button
        onClick={() => navigate(shiftDate(selectedDate, -1))}
        aria-label="Previous date"
        className={cn(
          "flex size-7 items-center justify-center rounded-md transition-colors",
          "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
      >
        <ChevronLeft className="size-4" />
      </button>

      {/* Date label */}
      <span className="min-w-[132px] text-center text-sm font-medium text-muted-foreground">
        {isToday ? "Today" : formatDate(selectedDate)}
      </span>

      {/* Next day — disabled at today */}
      <button
        onClick={() => navigate(shiftDate(selectedDate, 1))}
        disabled={isToday}
        aria-label="Next date"
        className={cn(
          "flex size-7 items-center justify-center rounded-md transition-colors",
          "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          "disabled:pointer-events-none disabled:opacity-30"
        )}
      >
        <ChevronRight className="size-4" />
      </button>

      {/* Today shortcut — only shown when not already on today */}
      {!isToday && (
        <button
          onClick={() => navigate(today)}
          className={cn(
            "ml-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium",
            "text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          )}
        >
          Today
        </button>
      )}
    </div>
  );
}
