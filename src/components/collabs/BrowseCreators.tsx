"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import type { CreatorProfileSummary } from "@/types";
import { CreatorGrid } from "@/components/collabs/CreatorGrid";
import { CreatorSearchFilterBar, EMPTY_CREATOR_FILTERS, type CreatorFilters } from "@/components/collabs/CreatorSearchFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";

function buildParams(f: CreatorFilters, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.role) params.set("role", f.role);
  if (f.genre) params.set("genre", f.genre);
  if (f.skill) params.set("skill", f.skill);
  if (f.location) params.set("location", f.location);
  if (f.availability) params.set("availability", f.availability);
  params.set("page", String(page));
  return params;
}

export function BrowseCreators({
  initialCreators,
  initialTotal,
  initialFilters,
}: {
  initialCreators: CreatorProfileSummary[];
  initialTotal: number;
  initialFilters: CreatorFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<CreatorFilters>(initialFilters);
  const [creators, setCreators] = useState<CreatorProfileSummary[]>(initialCreators);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);

  const fetchCreators = useCallback(async (f: CreatorFilters, targetPage: number, append: boolean) => {
    const params = buildParams(f, targetPage);
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/creators?${params.toString()}`);
      const data = await res.json();
      setCreators((prev) => (append ? [...prev, ...data.creators] : data.creators));
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
    if (filters.role) params.set("role", filters.role);
    if (filters.genre) params.set("genre", filters.genre);
    if (filters.skill) params.set("skill", filters.skill);
    if (filters.location) params.set("location", filters.location);
    if (filters.availability) params.set("availability", filters.availability);
    router.replace(params.toString() ? `/creators?${params.toString()}` : "/creators", { scroll: false });

    fetchCreators(filters, 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    const next: CreatorFilters = {
      q: searchParams.get("q") ?? "",
      role: searchParams.get("role") ?? "",
      genre: searchParams.get("genre") ?? "",
      skill: searchParams.get("skill") ?? "",
      location: searchParams.get("location") ?? "",
      availability: searchParams.get("availability") ?? "",
    };
    setFilters((prev) => {
      const unchanged = (Object.keys(next) as (keyof CreatorFilters)[]).every((k) => prev[k] === next[k]);
      return unchanged ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const hasMore = creators.length < total;

  return (
    <div className="flex flex-col gap-6">
      <CreatorSearchFilterBar filters={filters} onChange={setFilters} />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-shimmer h-40 rounded-xl border border-border" />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No creators found"
          description="Try adjusting your filters."
          action={
            <button
              onClick={() => setFilters(EMPTY_CREATOR_FILTERS)}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-muted-2"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <CreatorGrid creators={creators} />
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchCreators(filters, page + 1, true)}
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
