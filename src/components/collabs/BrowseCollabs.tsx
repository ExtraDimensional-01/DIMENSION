"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { CollabPostSummary } from "@/types";
import { CollabPostGrid } from "@/components/collabs/CollabPostGrid";
import { CollabSearchFilterBar, EMPTY_COLLAB_FILTERS, type CollabFilters } from "@/components/collabs/CollabSearchFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";

function buildParams(f: CollabFilters, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.lookingFor) params.set("lookingFor", f.lookingFor);
  if (f.genre) params.set("genre", f.genre);
  if (f.location) params.set("location", f.location);
  if (f.locationType) params.set("locationType", f.locationType);
  if (f.skill) params.set("skill", f.skill);
  if (f.isPaid) params.set("isPaid", f.isPaid);
  if (f.sort && f.sort !== "newest") params.set("sort", f.sort);
  params.set("page", String(page));
  return params;
}

export function BrowseCollabs({
  initialPosts,
  initialTotal,
  initialFilters,
}: {
  initialPosts: CollabPostSummary[];
  initialTotal: number;
  initialFilters: CollabFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<CollabFilters>(initialFilters);
  const [posts, setPosts] = useState<CollabPostSummary[]>(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);

  const fetchPosts = useCallback(async (f: CollabFilters, targetPage: number, append: boolean) => {
    const params = buildParams(f, targetPage);
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/collabs/posts?${params.toString()}`);
      const data = await res.json();
      setPosts((prev) => (append ? [...prev, ...data.posts] : data.posts));
      setTotal(data.total);
      setPage(targetPage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false);
      return;
    }
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.lookingFor) params.set("lookingFor", filters.lookingFor);
    if (filters.genre) params.set("genre", filters.genre);
    if (filters.location) params.set("location", filters.location);
    if (filters.locationType) params.set("locationType", filters.locationType);
    if (filters.skill) params.set("skill", filters.skill);
    if (filters.isPaid) params.set("isPaid", filters.isPaid);
    if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
    router.replace(params.toString() ? `/collabs?${params.toString()}` : "/collabs", { scroll: false });

    fetchPosts(filters, 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    const next: CollabFilters = {
      q: searchParams.get("q") ?? "",
      lookingFor: searchParams.get("lookingFor") ?? "",
      genre: searchParams.get("genre") ?? "",
      location: searchParams.get("location") ?? "",
      locationType: searchParams.get("locationType") ?? "",
      skill: searchParams.get("skill") ?? "",
      isPaid: searchParams.get("isPaid") ?? "",
      sort: searchParams.get("sort") ?? "newest",
    };
    setFilters((prev) => {
      const unchanged = (Object.keys(next) as (keyof CollabFilters)[]).every((k) => prev[k] === next[k]);
      return unchanged ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const hasMore = posts.length < total;

  return (
    <div id="browse" className="flex scroll-mt-20 flex-col gap-6">
      <CollabSearchFilterBar filters={filters} onChange={setFilters} />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-shimmer h-48 rounded-xl border border-border" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No collaborations found"
          description="Try adjusting your search or filters, or be the first to post one."
          action={
            <button
              onClick={() => setFilters({ ...EMPTY_COLLAB_FILTERS, sort: filters.sort })}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-muted-2"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <CollabPostGrid posts={posts} />
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchPosts(filters, page + 1, true)}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-muted-2 disabled:opacity-60"
              >
                {loadingMore && <Loader2 size={14} className="animate-spin" />}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
