"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { BeatSummary } from "@/types";
import { BPM_RANGES } from "@/lib/constants";
import { BeatGrid } from "@/components/beats/BeatGrid";
import { BeatGridSkeleton } from "@/components/beats/BeatCardSkeleton";
import { SearchFilterBar, EMPTY_FILTERS, type Filters } from "@/components/beats/SearchFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";

function bpmRangeToMinMax(label: string): { min?: number; max?: number } {
  const range = BPM_RANGES.find((r) => r.label === label);
  return { min: range?.min, max: range?.max };
}

function buildParams(f: Filters, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.genre) params.set("genre", f.genre);
  if (f.mood) params.set("mood", f.mood);
  if (f.key) params.set("key", f.key);
  if (f.tag) params.set("tag", f.tag);
  if (f.bpmRange) {
    const { min, max } = bpmRangeToMinMax(f.bpmRange);
    if (min !== undefined) params.set("bpmMin", String(min));
    if (max !== undefined) params.set("bpmMax", String(max));
  }
  if (f.sort && f.sort !== "newest") params.set("sort", f.sort);
  params.set("page", String(page));
  return params;
}

export function BrowseBeats({
  initialBeats,
  initialTotal,
  initialFilters,
}: {
  initialBeats: BeatSummary[];
  initialTotal: number;
  initialFilters: Filters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [beats, setBeats] = useState<BeatSummary[]>(initialBeats);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);

  const fetchBeats = useCallback(async (f: Filters, targetPage: number, append: boolean) => {
    const params = buildParams(f, targetPage);

    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/beats?${params.toString()}`);
      const data = await res.json();
      setBeats((prev) => (append ? [...prev, ...data.beats] : data.beats));
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

    // Route params only need the filter values, not bpmMin/bpmMax/page.
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.genre) params.set("genre", filters.genre);
    if (filters.mood) params.set("mood", filters.mood);
    if (filters.key) params.set("key", filters.key);
    if (filters.tag) params.set("tag", filters.tag);
    if (filters.bpmRange) params.set("bpm", filters.bpmRange);
    if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
    router.replace(params.toString() ? `/?${params.toString()}` : "/", { scroll: false });

    fetchBeats(filters, 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // keep in sync if user navigates via browser back/forward
  useEffect(() => {
    const next: Filters = {
      q: searchParams.get("q") ?? "",
      genre: searchParams.get("genre") ?? "",
      mood: searchParams.get("mood") ?? "",
      key: searchParams.get("key") ?? "",
      bpmRange: searchParams.get("bpm") ?? "",
      tag: searchParams.get("tag") ?? "",
      sort: searchParams.get("sort") ?? "newest",
    };
    setFilters((prev) => {
      const unchanged = (Object.keys(next) as (keyof Filters)[]).every((k) => prev[k] === next[k]);
      return unchanged ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const hasMore = beats.length < total;

  return (
    <div className="flex flex-col gap-6">
      <SearchFilterBar filters={filters} onChange={setFilters} />

      {loading ? (
        <BeatGridSkeleton />
      ) : beats.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No beats found"
          description="Try adjusting your search or filters to find what you're looking for."
          action={
            <button
              onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort })}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-muted-2"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <BeatGrid beats={beats} />
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchBeats(filters, page + 1, true)}
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
