"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { COLLAB_ROLES, GENRES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface CreatorFilters {
  q: string;
  role: string;
  genre: string;
  skill: string;
  location: string;
  availability: string;
}

export const EMPTY_CREATOR_FILTERS: CreatorFilters = {
  q: "",
  role: "",
  genre: "",
  skill: "",
  location: "",
  availability: "",
};

export function CreatorSearchFilterBar({
  filters,
  onChange,
}: {
  filters: CreatorFilters;
  onChange: (filters: CreatorFilters) => void;
}) {
  const [q, setQ] = useState(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQ(filters.q), [filters.q]);

  function handleQChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange({ ...filters, q: value }), 350);
  }

  const anyActive = Boolean(filters.q || filters.role || filters.genre || filters.skill || filters.location || filters.availability);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 transition focus-within:border-muted-2">
        <Search size={17} className="shrink-0 text-muted-2" />
        <input
          value={q}
          onChange={(e) => handleQChange(e.target.value)}
          placeholder="Search creators by name, genre, skill..."
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
          const active = filters.role === value;
          return (
            <button
              key={role}
              onClick={() => onChange({ ...filters, role: value })}
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
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">Genre</span>
          <select
            value={filters.genre}
            onChange={(e) => onChange({ ...filters, genre: e.target.value })}
            className="input truncate py-2.5 text-xs"
          >
            <option value="">All genres</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">Skill</span>
          <input
            value={filters.skill}
            onChange={(e) => onChange({ ...filters, skill: e.target.value })}
            placeholder="Mixing, mastering..."
            className="input py-2.5 text-xs"
          />
        </div>

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

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
            Availability
          </span>
          <select
            value={filters.availability}
            onChange={(e) => onChange({ ...filters, availability: e.target.value })}
            className="input py-2.5 text-xs"
          >
            <option value="">Any</option>
            <option value="open">Open to Work</option>
            <option value="busy">Busy</option>
            <option value="not_available">Not Available</option>
          </select>
        </div>
      </div>

      {anyActive && (
        <button
          onClick={() => {
            setQ("");
            onChange(EMPTY_CREATOR_FILTERS);
          }}
          className="self-start text-xs text-muted-2 underline-offset-2 hover:text-foreground hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
