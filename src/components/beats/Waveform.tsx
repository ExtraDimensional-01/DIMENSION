"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface WaveformProps {
  /** Real extracted amplitude peaks (0-1), or null/empty for beats uploaded before this feature existed. */
  peaks: number[] | null | undefined;
  /** Fraction played, 0-1. Bars before this point render in the accent color. */
  progress?: number;
  /** If provided, the waveform becomes clickable/seekable and calls back with the clicked fraction (0-1). */
  onSeek?: (fraction: number) => void;
  className?: string;
  barClassName?: string;
  /** Minimum bar height as a percentage, so quiet passages stay visible instead of disappearing. */
  minBarHeightPct?: number;
  /** Fraction (0-1) beyond which playback is locked (e.g. a paid beat's free-preview cutoff) — rendered dimmed. */
  lockedFraction?: number | null;
}

// Gentle placeholder shape for beats with no real waveform data on record.
const FALLBACK_PEAKS = Array.from({ length: 60 }, (_, i) => 0.18 + 0.14 * Math.abs(Math.sin(i * 0.7)));

export function Waveform({
  peaks,
  progress = 0,
  onSeek,
  className,
  barClassName,
  minBarHeightPct = 6,
  lockedFraction = null,
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const data = peaks && peaks.length > 0 ? peaks : FALLBACK_PEAKS;
  const playedCount = Math.round(data.length * Math.min(1, Math.max(0, progress)));
  const lockedFromIndex =
    lockedFraction != null ? Math.round(data.length * Math.min(1, Math.max(0, lockedFraction))) : null;

  function handleSeekEvent(clientX: number) {
    if (!onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(fraction);
  }

  return (
    <div
      ref={containerRef}
      onClick={(e) => handleSeekEvent(e.clientX)}
      role={onSeek ? "slider" : undefined}
      aria-label={onSeek ? "Seek" : undefined}
      aria-valuenow={onSeek ? Math.round(progress * 100) : undefined}
      className={cn(
        "flex h-full w-full items-center gap-[2px] overflow-hidden",
        onSeek && "cursor-pointer",
        className
      )}
    >
      {data.map((peak, i) => {
        const isPlayed = i < playedCount;
        const isLocked = lockedFromIndex != null && i >= lockedFromIndex;
        return (
          <div
            key={i}
            className={cn(
              "min-w-[1.5px] flex-1 rounded-full transition-colors duration-150",
              isLocked ? "bg-border/40" : isPlayed ? "bg-accent" : "bg-border",
              barClassName
            )}
            style={{ height: `${Math.max(minBarHeightPct, peak * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
