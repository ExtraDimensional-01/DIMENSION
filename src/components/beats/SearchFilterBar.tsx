"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Tag as TagIcon, X } from "lucide-react";
import { GENRES, MOODS, MUSICAL_KEYS, BPM_RANGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface Filters {
  q: string;
  genre: string;
  mood: string;
  key: string;
  bpmRange: string;
  tag: string;
  sort: string;
}

export const EMPTY_FILTERS: Filters = {
  q: "",
  genre: "",
  mood: "",
  key: "",
  bpmRange: "",
  tag: "",
  sort: "newest",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "popular", label: "Most played" },
];

function DropdownField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "input truncate py-2.5 text-xs",
          value && "border-accent/50 text-foreground"
        )}
      >
        {children}
      </select>
    </div>
  );
}

export function SearchFilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const [q, setQ] = useState(filters.q);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setAvailableTags(d.tags ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setQ(filters.q);
  }, [filters.q]);

  function handleQChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, q: value });
    }, 350);
  }

  const activeCount = [filters.genre, filters.mood, filters.key, filters.bpmRange, filters.tag].filter(
    Boolean
  ).length;
  const anyActive = activeCount > 0 || Boolean(filters.q);

  return (
    <div className="flex flex-col gap-3">
      <div className="cut-corner-sm flex items-center gap-2 border border-border bg-surface px-4 py-3 transition focus-within:border-accent/50 focus-within:shadow-[0_0_0_3px_rgba(155,77,255,0.12)]">
        <Search size={17} className="shrink-0 text-muted-2" />
        <input
          value={q}
          onChange={(e) => handleQChange(e.target.value)}
          placeholder="Search by title, producer, or tag..."
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
        />
        {q && (
          <button
            onClick={() => handleQChange("")}
            className="text-muted-2 hover:text-foreground"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:gap-3">
        <DropdownField
          label="Genre"
          value={filters.genre}
          onChange={(v) => onChange({ ...filters, genre: v })}
        >
          <option value="">All genres</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </DropdownField>

        <DropdownField
          label="Mood"
          value={filters.mood}
          onChange={(v) => onChange({ ...filters, mood: v })}
        >
          <option value="">Any mood</option>
          {MOODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </DropdownField>

        <DropdownField
          label="BPM"
          value={filters.bpmRange}
          onChange={(v) => onChange({ ...filters, bpmRange: v })}
        >
          {BPM_RANGES.map((r) => (
            <option key={r.label} value={r.label === "Any BPM" ? "" : r.label}>
              {r.label}
            </option>
          ))}
        </DropdownField>

        <DropdownField label="Key" value={filters.key} onChange={(v) => onChange({ ...filters, key: v })}>
          <option value="">Any key</option>
          {MUSICAL_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </DropdownField>

        <div className="flex flex-1 flex-col gap-1">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
            Tags
          </span>
          <button
            onClick={() => setTagsOpen((v) => !v)}
            className={cn(
              "input flex items-center justify-between gap-1.5 py-2.5 text-left text-xs transition hover:border-muted-2",
              filters.tag && "border-accent/50 text-accent"
            )}
          >
            <span className="flex items-center gap-1.5 truncate">
              <TagIcon size={12} />
              {filters.tag ? `#${filters.tag}` : "Any tag"}
            </span>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 sm:flex-none sm:items-end">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
            Sort
          </span>
          <select
            value={filters.sort}
            onChange={(e) => onChange({ ...filters, sort: e.target.value })}
            className="input py-2.5 text-xs sm:w-36"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tagsOpen && (
        <div className="animate-fade-in flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
          {availableTags.length === 0 && (
            <p className="px-1 py-1 text-xs text-muted-2">No tags yet</p>
          )}
          {availableTags.map((t) => (
            <button
              key={t}
              onClick={() => onChange({ ...filters, tag: filters.tag === t ? "" : t })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                filters.tag === t
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted hover:border-muted-2 hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {anyActive && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.genre && (
            <FilterPill label={filters.genre} onRemove={() => onChange({ ...filters, genre: "" })} />
          )}
          {filters.mood && (
            <FilterPill label={filters.mood} onRemove={() => onChange({ ...filters, mood: "" })} />
          )}
          {filters.bpmRange && (
            <FilterPill
              label={`${filters.bpmRange} BPM`}
              onRemove={() => onChange({ ...filters, bpmRange: "" })}
            />
          )}
          {filters.key && (
            <FilterPill label={filters.key} onRemove={() => onChange({ ...filters, key: "" })} />
          )}
          {filters.tag && (
            <FilterPill label={`#${filters.tag}`} onRemove={() => onChange({ ...filters, tag: "" })} />
          )}
          <button
            onClick={() => {
              setQ("");
              onChange({ ...EMPTY_FILTERS, sort: filters.sort });
            }}
            className="text-xs text-muted-2 underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-surface-hover px-3 py-1 text-xs text-foreground">
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label} filter`}>
        <X size={12} className="text-muted-2 hover:text-foreground" />
      </button>
    </span>
  );
}
