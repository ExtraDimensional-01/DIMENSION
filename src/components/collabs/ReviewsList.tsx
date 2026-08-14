import Image from "next/image";
import { Star } from "lucide-react";
import type { CollabReview } from "@/types";
import { formatRelativeDate, initials } from "@/lib/utils";

const CATEGORIES: { key: keyof Pick<CollabReview, "communication" | "reliability" | "qualityOfWork" | "professionalism">; label: string }[] = [
  { key: "communication", label: "Communication" },
  { key: "reliability", label: "Reliability" },
  { key: "qualityOfWork", label: "Quality of Work" },
  { key: "professionalism", label: "Professionalism" },
];

export function ReviewsList({ reviews }: { reviews: CollabReview[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-2">No reviews yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-accent">
                {review.reviewer.profileImageUrl ? (
                  <Image src={review.reviewer.profileImageUrl} alt="" fill sizes="32px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-accent-foreground">
                    {initials(review.reviewer.producerName)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{review.reviewer.producerName}</p>
                <p className="text-[11px] text-muted-2">{formatRelativeDate(review.createdAt)}</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
              <Star size={13} className="fill-current text-accent" />
              {review.overall}/5
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <div key={c.key} className="rounded-lg bg-surface px-2 py-1.5 text-center">
                <p className="text-xs font-semibold text-foreground">{review[c.key]}/5</p>
                <p className="text-[9px] uppercase tracking-wide text-muted-2">{c.label}</p>
              </div>
            ))}
          </div>

          {review.comment && <p className="mt-3 text-sm text-muted">{review.comment}</p>}
        </div>
      ))}
    </div>
  );
}
