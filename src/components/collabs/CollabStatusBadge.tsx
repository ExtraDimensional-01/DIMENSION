import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  reviewing: "Reviewing Applicants",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-hover text-muted",
  open: "bg-accent/15 text-accent",
  reviewing: "bg-accent/15 text-accent",
  in_progress: "bg-success/15 text-success",
  completed: "bg-surface-hover text-foreground",
  cancelled: "bg-danger/10 text-danger",
};

export function CollabStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
        STATUS_STYLES[status] ?? "bg-surface-hover text-muted",
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
