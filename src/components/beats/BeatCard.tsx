"use client";

import Link from "next/link";
import Image from "next/image";
import { Pause, Play, Music2, EyeOff, Lock } from "lucide-react";
import { usePlayer } from "@/components/player/PlayerContext";
import { Waveform } from "@/components/beats/Waveform";
import type { BeatSummary } from "@/types";
import { cn, formatDuration, formatPrice, initials } from "@/lib/utils";

export function BeatCard({ beat, queue }: { beat: BeatSummary; queue: BeatSummary[] }) {
  const { currentBeat, isPlaying, currentTime, duration, previewLimitSec, playBeat, togglePlay, seek } =
    usePlayer();
  const isCurrent = currentBeat?.id === beat.id;
  const showPause = isCurrent && isPlaying;
  const cardProgress = isCurrent && duration > 0 ? currentTime / duration : 0;
  const cardLockedFraction = isCurrent && previewLimitSec && duration > 0 ? previewLimitSec / duration : null;

  function handlePlayClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playBeat(beat, queue);
    }
  }

  function handleWaveformSeek(fraction: number) {
    if (isCurrent) {
      seek(fraction * duration);
    } else {
      playBeat(beat, queue);
    }
  }

  return (
    <Link
      href={`/beats/${beat.id}`}
      className={cn(
        "cut-corner-sm corner-frame group relative flex min-w-0 flex-col border border-border bg-surface p-3 transition hover:border-accent/50 hover:bg-surface-hover hover:shadow-[0_0_0_1px_rgba(155,77,255,0.3),0_16px_40px_-16px_var(--accent-glow)]",
        isCurrent && "is-active border-accent/50"
      )}
    >
      <div className="cut-corner-sm relative mb-3 aspect-square w-full overflow-hidden bg-background">
        {beat.coverUrl ? (
          <Image
            src={beat.coverUrl}
            alt={beat.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 220px, 260px"
            className="object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-2">
            <Music2 size={28} />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {!beat.isPublic && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted backdrop-blur">
            <EyeOff size={10} />
            Unlisted
          </span>
        )}

        {beat.startingPriceCents != null && (
          <span className="glow-accent absolute right-2 top-2 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
            {beat.exclusiveSoldAt ? "Sold" : `From ${formatPrice(beat.startingPriceCents)}`}
          </span>
        )}

        {isCurrent && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur">
            <span className="flex gap-0.5">
              <span
                className={cn("h-2 w-0.5 rounded-full bg-accent", isPlaying && "animate-pulse")}
              />
              <span
                className={cn("h-3 w-0.5 rounded-full bg-accent", isPlaying && "animate-pulse")}
                style={{ animationDelay: "150ms" }}
              />
              <span
                className={cn("h-1.5 w-0.5 rounded-full bg-accent", isPlaying && "animate-pulse")}
                style={{ animationDelay: "300ms" }}
              />
            </span>
          </div>
        )}
      </div>

      {/* Transport row — play button + waveform + duration, matches directly under the artwork */}
      <div
        className="flex items-center gap-2"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <button
          onClick={handlePlayClick}
          className="glow-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:scale-105 active:scale-95"
          aria-label={showPause ? "Pause" : "Play"}
        >
          {showPause ? (
            <Pause size={12} fill="currentColor" />
          ) : (
            <Play size={12} fill="currentColor" className="ml-0.5" />
          )}
        </button>
        <div className="h-5 min-w-0 flex-1">
          <Waveform
            peaks={beat.waveformPeaks}
            progress={cardProgress}
            onSeek={handleWaveformSeek}
            lockedFraction={cardLockedFraction}
          />
        </div>
        {cardLockedFraction != null && <Lock size={10} className="shrink-0 text-muted-2" />}
        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-2">
          {formatDuration(beat.durationSec)}
        </span>
      </div>

      <h3 className="mt-3 truncate font-display text-base font-bold tracking-tight text-foreground">
        {beat.title}
      </h3>
      <p className="mt-0.5 truncate text-[11px] text-muted-2">
        {beat.bpm} BPM · {beat.key}
      </p>

      <div className="mt-2 flex items-center gap-1.5">
        <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full bg-accent/20 ring-1 ring-white/10">
          {beat.producer.profileImageUrl ? (
            <Image src={beat.producer.profileImageUrl} alt="" fill sizes="16px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[7px] font-semibold text-accent">
              {initials(beat.producer.producerName)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted">Prod. {beat.producer.producerName}</p>
      </div>

      {beat.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {beat.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="truncate rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
