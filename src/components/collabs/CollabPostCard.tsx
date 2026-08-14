import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin, Star, Users } from "lucide-react";
import type { CollabPostSummary } from "@/types";
import { CollabStatusBadge } from "@/components/collabs/CollabStatusBadge";
import { formatPrice, formatRelativeDate, initials } from "@/lib/utils";

function budgetLabel(post: CollabPostSummary): string {
  if (!post.isPaid) return "Free / Collab";
  if (post.budgetMinCents != null && post.budgetMaxCents != null) {
    return `${formatPrice(post.budgetMinCents)}–${formatPrice(post.budgetMaxCents)}`;
  }
  if (post.budgetMinCents != null) return `From ${formatPrice(post.budgetMinCents)}`;
  if (post.budgetMaxCents != null) return `Up to ${formatPrice(post.budgetMaxCents)}`;
  return "Paid";
}

export function CollabPostCard({ post }: { post: CollabPostSummary }) {
  return (
    <Link
      href={`/collabs/${post.id}`}
      className="group corner-frame cut-corner relative flex flex-col gap-3 rounded-xl border border-transparent bg-surface p-4 transition hover:border-accent/40 hover:bg-surface-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
          Looking for {post.lookingFor}
        </span>
        <CollabStatusBadge status={post.status} />
      </div>

      <h3 className="line-clamp-2 text-base font-semibold text-foreground">{post.title}</h3>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-2">
        <span className="rounded-full border border-border px-2 py-0.5">{post.genre}</span>
        {post.subgenre && <span className="rounded-full border border-border px-2 py-0.5">{post.subgenre}</span>}
        <span className="rounded-full border border-border px-2 py-0.5">
          {post.locationType === "remote" ? "Remote" : post.locationType === "in_person" ? "In Person" : "Remote / In Person"}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-accent">
            {post.creator.profileImageUrl ? (
              <Image src={post.creator.profileImageUrl} alt="" fill sizes="28px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-accent-foreground">
                {initials(post.creator.producerName)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{post.creator.producerName}</p>
            {post.creator.ratingCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-2">
                <Star size={9} className="fill-current text-accent" />
                {post.creator.ratingAvg?.toFixed(1)} ({post.creator.ratingCount})
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-foreground">{budgetLabel(post)}</p>
          <p className="text-[10px] text-muted-2">{formatRelativeDate(post.createdAt)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-2">
        {post.location && (
          <span className="flex items-center gap-1">
            <MapPin size={10} />
            {post.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users size={10} />
          {post.applicationCount} applied
        </span>
        {post.deadline && (
          <span className="flex items-center gap-1">
            <Clock size={10} />
            Due {new Date(post.deadline).toLocaleDateString()}
          </span>
        )}
      </div>
    </Link>
  );
}
