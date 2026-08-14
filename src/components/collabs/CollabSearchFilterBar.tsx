"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { COLLAB_ROLES, GENRES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface CollabFilters {
  q: string;
  lookingFor: string;
  genre: string;
  location: string;
  locationType: string;
  skill: string;
  isPaid: string; // "" | "true" | "false"
  sort: string;
}

export const EMPTY_COLLAB_FILTERS: CollabFilters = {
  q: "",
  lookingFor: "",
  genre: "",
  location: "",
  locationType: "",
  skill: "",
  isPaid: "",
  sort: "newest",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Recently Posted" },
  { value: "popular", label: "Most Popular" },
  { value: "oldest", label: "Oldest" },
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
        className={cn("input truncate py-2.5 text-xs", value && "border-accent/50 text-foreground")}
      >
        {children}
      </select>
    </div>
  );
}

export function CollabSearchFilterBar({
  filters,
  onChange,
}: {
  filters: CollabFilters;
  onChange: (filters: CollabFilters) => void;
}) {
  const [q, setQ] = useState(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(filters.q);
  }, [filters.q]);

  function handleQChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange({ ...filters, q: value }), 350);
  }

  const activeCount = [filters.genre, filters.location, filters.locationType, filters.skill, filters.isPaid].filter(
    Boolean
  ).length;
  const anyActive = activeCount > 0 || Boolean(filters.q) || Boolean(filters.lookingFor);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 transition focus-within:border-muted-2">
        <Search size={17} className="shrink-0 text-muted-2" />
        <input
          value={q}
          onChange={(e) => handleQChange(e.target.value)}
          placeholder="Search collaborations, creators, genres, skills..."
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
        />
        {q && (
          <button onClick={() => handleQChange("")} className="text-muted-2 hover:text-foreground" aria-label="Clear search">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {["All", ...COLLAB_ROLES].map((role) => {
          const value = role === "All" ? "" : role;
          const active = filters.lookingFor === value;
          return (
            <button
              key={role}
              onClick={() => onChange({ ...filters, lookingFor: value })}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                active
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted hover:border-muted-2 hover:text-foreground"
              )}
            >
              {role}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:gap-3">
        <DropdownField label="Genre" value={filters.genre} onChange={(v) => onChange({ ...filters, genre: v })}>
          <option value="">All genres</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </DropdownField>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
            Location
          </span>
          <input
            value={filters.location}
            onChange={(e) => onChange({ ...filters, location: e.target.value })}
            placeholder="City, country..."
            className="input py-2.5 text-xs"
          />
        </div>

        <DropdownField
          label="Remote / In Person"
          value={filters.locationType}
          onChange={(v) => onChange({ ...filters, locationType: v })}
        >
          <option value="">Any</option>
          <option value="remote">Remote</option>
          <option value="in_person">In Person</option>
          <option value="both">Either</option>
        </DropdownField>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
            Skill
          </span>
          <input
            value={filters.skill}
            onChange={(e) => onChange({ ...filters, skill: e.target.value })}
            placeholder="Mixing, Vocal Tuning..."
            className="input py-2.5 text-xs"
          />
        </div>

        <DropdownField label="Paid / Free" value={filters.isPaid} onChange={(v) => onChange({ ...filters, isPaid: v })}>
          <option value="">Any</option>
          <option value="true">Paid</option>
          <option value="false">Free</option>
        </DropdownField>

        <div className="flex flex-1 flex-col gap-1 sm:flex-none sm:items-end">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
            Sort
          </span>
          <select
            value={filters.sort}
            onChange={(e) => onChange({ ...filters, sort: e.target.value })}
            className="input py-2.5 text-xs sm:w-40"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {anyActive && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.genre && <FilterPill label={filters.genre} onRemove={() => onChange({ ...filters, genre: "" })} />}
          {filters.location && (
            <FilterPill label={filters.location} onRemove={() => onChange({ ...filters, location: "" })} />
          )}
          {filters.locationType && (
            <FilterPill
              label={filters.locationType === "remote" ? "Remote" : filters.locationType === "in_person" ? "In Person" : "Either"}
              onRemove={() => onChange({ ...filters, locationType: "" })}
            />
          )}
          {filters.skill && <FilterPill label={filters.skill} onRemove={() => onChange({ ...filters, skill: "" })} />}
          {filters.isPaid && (
            <FilterPill
              label={filters.isPaid === "true" ? "Paid" : "Free"}
              onRemove={() => onChange({ ...filters, isPaid: "" })}
            />
          )}
          <button
            onClick={() => {
              setQ("");
              onChange({ ...EMPTY_COLLAB_FILTERS, sort: filters.sort });
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
