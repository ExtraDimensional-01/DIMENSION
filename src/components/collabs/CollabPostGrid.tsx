import type { CollabPostSummary } from "@/types";
import { CollabPostCard } from "@/components/collabs/CollabPostCard";

export function CollabPostGrid({ posts }: { posts: CollabPostSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <CollabPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
