"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Music2, Pause, Play } from "lucide-react";
import type { BeatSummary } from "@/types";
import { usePlayer } from "@/components/player/PlayerContext";
import { formatDuration, cn } from "@/lib/utils";

export function TrendingList({ beats }: { beats: BeatSummary[] }) {
  const { currentBeat, isPlaying, playBeat, togglePlay } = usePlayer();

  if (beats.length === 0) return null;

  return (
    <div className="cut-corner-lg corner-frame relative flex flex-col border border-border bg-surface/80 p-5 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <span className="kicker">Trending beats</span>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" />
        </span>
      </div>

      <div className="relative flex flex-col">
        {beats.map((beat) => {
          const isCurrent = currentBeat?.id === beat.id;
          const showPause = isCurrent && isPlaying;

          return (
            <Link
              key={beat.id}
              href={`/beats/${beat.id}`}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-1.5 py-2.5 transition hover:bg-accent/[0.06]",
                isCurrent && "bg-accent/[0.1]"
              )}
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  isCurrent ? togglePlay() : playBeat(beat, beats);
                }}
                className={cn(
                  "cut-corner-sm relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden bg-surface ring-1 ring-accent/25 transition",
                  isCurrent && "ring-accent/60"
                )}
                aria-label={showPause ? "Pause" : "Play"}
              >
                {beat.coverUrl ? (
                  <Image src={beat.coverUrl} alt="" fill sizes="44px" className="object-cover" />
                ) : (
                  <Music2 size={13} className="text-muted-2" />
                )}
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition group-hover:opacity-100",
                    isCurrent && "opacity-100"
                  )}
                >
                  {showPause ? (
                    <Pause size={12} className="text-white" fill="currentColor" />
                  ) : (
                    <Play size={12} className="ml-0.5 text-white" fill="currentColor" />
                  )}
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{beat.title}</p>
                <p className="truncate text-[11px] text-muted-2">
                  {beat.bpm} BPM · {beat.key}
                </p>
              </div>

              <span className="shrink-0 text-[11px] tabular-nums text-muted-2">
                {formatDuration(beat.durationSec)}
              </span>
            </Link>
          );
        })}
      </div>

      <Link
        href="/?sort=popular"
        className="relative mt-1 flex items-center justify-center gap-1.5 pt-4 text-xs font-medium text-accent transition hover:text-accent-hover"
      >
        View all
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}
