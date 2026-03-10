"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  poolId: string;
  selectedDate: string;
  availableDates: string[];
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function DateNav({ poolId, selectedDate, availableDates }: Props) {
  const router = useRouter();
  const idx = availableDates.indexOf(selectedDate);
  const prevDate = idx > 0 ? availableDates[idx - 1] : null;
  const nextDate = idx < availableDates.length - 1 ? availableDates[idx + 1] : null;

  function navigate(date: string) {
    router.push(`/pools/${poolId}?date=${date}`);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => prevDate && navigate(prevDate)}
        disabled={!prevDate}
        aria-label="Previous date"
        className={cn(
          "flex size-7 items-center justify-center rounded-md transition-colors",
          "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          "disabled:pointer-events-none disabled:opacity-30"
        )}
      >
        <ChevronLeft className="size-4" />
      </button>

      <span className="min-w-[132px] text-center text-sm font-medium text-muted-foreground">
        {formatDate(selectedDate)}
      </span>

      <button
        onClick={() => nextDate && navigate(nextDate)}
        disabled={!nextDate}
        aria-label="Next date"
        className={cn(
          "flex size-7 items-center justify-center rounded-md transition-colors",
          "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          "disabled:pointer-events-none disabled:opacity-30"
        )}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
