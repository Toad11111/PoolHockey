import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  setup: {
    label: "Setup",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  },
  active: {
    label: "Active",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  },
  completed: {
    label: "Completed",
    className: "border-sky-500/25 bg-sky-500/10 text-sky-400",
  },
  archived: {
    label: "Archived",
    className: "border-zinc-600/25 bg-zinc-600/10 text-zinc-500",
  },
} as const;

type Status = keyof typeof STATUS_CONFIG;

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as Status] ?? {
    label: status,
    className: "border-border bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
