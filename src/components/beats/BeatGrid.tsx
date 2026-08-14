"use client";

import type { BeatSummary } from "@/types";
import { BeatCard } from "@/components/beats/BeatCard";

export function BeatGrid({ beats }: { beats: BeatSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {beats.map((beat) => (
        <BeatCard key={beat.id} beat={beat} queue={beats} />
      ))}
    </div>
  );
}
