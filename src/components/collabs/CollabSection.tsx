import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CollabPostSummary } from "@/types";
import { CollabPostCard } from "@/components/collabs/CollabPostCard";

export function CollabSection({
  title,
  posts,
  viewAllHref,
}: {
  title: string;
  posts: CollabPostSummary[];
  viewAllHref?: string;
}) {
  if (posts.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-tight text-foreground sm:text-base">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs font-medium text-accent transition hover:text-accent-hover"
          >
            View all
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
      <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {posts.map((post) => (
          <div key={post.id} className="w-72 shrink-0">
            <CollabPostCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
}
