import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import type { CreatorProfileSummary } from "@/types";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

const AVAILABILITY_LABELS: Record<string, string> = {
  open: "Open to Work",
  busy: "Busy",
  not_available: "Not Available",
};

export function CreatorCard({ creator }: { creator: CreatorProfileSummary }) {
  return (
    <div className="corner-frame cut-corner flex flex-col gap-3 rounded-xl border border-transparent bg-surface p-4 transition hover:border-accent/40 hover:bg-surface-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-accent">
            {creator.profileImageUrl ? (
              <Image src={creator.profileImageUrl} alt="" fill sizes="48px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-accent-foreground">
                {initials(creator.producerName)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{creator.producerName}</p>
            <p className="truncate text-xs text-muted">{creator.roles.join(" / ") || "Creator"}</p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wide",
            creator.availability === "open" ? "bg-success/15 text-success" : "bg-surface-hover text-muted-2"
          )}
        >
          {AVAILABILITY_LABELS[creator.availability] ?? creator.availability}
        </span>
      </div>

      {creator.headline && <p className="line-clamp-2 text-xs text-muted">{creator.headline}</p>}

      {creator.genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {creator.genres.slice(0, 3).map((g) => (
            <span key={g} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-2">
              {g}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
        {creator.ratingCount > 0 ? (
          <span className="flex items-center gap-1 text-xs text-muted-2">
            <Star size={11} className="fill-current text-accent" />
            {creator.ratingAvg?.toFixed(1)}{" "}
            <span className="text-muted-2">({creator.ratingCount})</span>
          </span>
        ) : (
          <span className="text-xs text-muted-2">No reviews yet</span>
        )}
        <Link
          href={`/creators/${creator.userId}`}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-muted-2"
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}
