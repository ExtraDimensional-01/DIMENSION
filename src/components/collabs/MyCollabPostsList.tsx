import Link from "next/link";
import { Pencil, Users } from "lucide-react";
import type { CollabPostSummary } from "@/types";
import { CollabStatusBadge } from "@/components/collabs/CollabStatusBadge";
import { formatRelativeDate } from "@/lib/utils";

export function MyCollabPostsList({ posts }: { posts: CollabPostSummary[] }) {
  if (posts.length === 0) {
    return <p className="text-sm text-muted-2">You haven&apos;t posted any collaborations yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
      {posts.map((post) => (
        <div key={post.id} className="flex items-center gap-3 bg-surface px-4 py-3 transition hover:bg-surface-hover">
          <Link href={`/collabs/${post.id}`} className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">{post.title}</p>
              <CollabStatusBadge status={post.status} />
            </div>
            <p className="truncate text-xs text-muted-2">
              Looking for {post.lookingFor} · {post.genre} · {formatRelativeDate(post.createdAt)}
            </p>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs text-muted-2">
              <Users size={12} />
              {post.applicationCount}
            </span>
            <Link
              href={`/collabs/${post.id}/edit`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-hover hover:text-foreground"
              aria-label="Edit"
            >
              <Pencil size={14} />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
