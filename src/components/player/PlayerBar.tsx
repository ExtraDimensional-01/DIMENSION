"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
  Loader2,
  Lock,
  Music2,
} from "lucide-react";
import { usePlayer } from "@/components/player/PlayerContext";
import { Waveform } from "@/components/beats/Waveform";
import { formatDuration, formatPrice, cn } from "@/lib/utils";

export function PlayerBar() {
  const {
    currentBeat,
    queue,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    previewLimitSec,
    togglePlay,
    seek,
    setVolume,
    playNext,
    playPrev,
    closePlayer,
  } = usePlayer();

  const [prevVolume, setPrevVolume] = useState(0.8);

  if (!currentBeat) return null;

  const idx = queue.findIndex((b) => b.id === currentBeat.id);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < queue.length - 1;
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 shadow-[0_-8px_40px_-8px_var(--accent-glow)] backdrop-blur-xl supports-[backdrop-filter]:bg-surface/85 animate-fade-in">
      <div className="energy-line absolute inset-x-0 top-0" />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: "radial-gradient(ellipse 700px 200px at 50% 0%, rgba(155,77,255,0.06), transparent 70%)",
        }}
      />
      <div className="relative mx-auto flex max-w-[1600px] items-center gap-3 px-3 py-3.5 sm:gap-4 sm:px-6">
        {/* Beat info */}
        <Link
          href={`/beats/${currentBeat.id}`}
          className="group flex min-w-0 flex-1 items-center gap-3 sm:flex-none sm:w-56"
        >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-background ring-1 ring-accent/35 transition group-hover:ring-accent/60">
            {currentBeat.coverUrl ? (
              <Image
                src={currentBeat.coverUrl}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-2">
                <Music2 size={16} />
              </div>
            )}
            <span
              className={cn(
                "absolute inset-0 bg-accent/10 opacity-0 transition",
                isPlaying && "opacity-100"
              )}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-display text-sm font-bold tracking-tight text-foreground">
                {currentBeat.title}
              </p>
              {currentBeat.startingPriceCents != null && (
                <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  {currentBeat.exclusiveSoldAt ? "Sold" : `From ${formatPrice(currentBeat.startingPriceCents)}`}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted">Prod. {currentBeat.producer.producerName}</p>
          </div>
        </Link>

        {/* Transport + progress */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={playPrev}
              disabled={!hasPrev}
              className="text-muted transition hover:text-foreground disabled:pointer-events-none disabled:opacity-30 hidden sm:block"
              aria-label="Previous beat"
            >
              <SkipBack size={16} fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-accent bg-black/60 text-foreground transition hover:scale-105 hover:bg-accent hover:text-accent-foreground active:scale-95",
                isPlaying ? "animate-pulse-glow" : "glow-accent"
              )}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <button
              onClick={playNext}
              disabled={!hasNext}
              className="text-muted transition hover:text-foreground disabled:pointer-events-none disabled:opacity-30 hidden sm:block"
              aria-label="Next beat"
            >
              <SkipForward size={16} fill="currentColor" />
            </button>
          </div>

          <div className="hidden w-full max-w-xl items-center gap-2 sm:flex">
            <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-2">
              {formatDuration(currentTime)}
            </span>
            <div className="h-9 w-full rounded-md bg-background/60 px-1 ring-1 ring-inset ring-white/[0.07]">
              <Waveform
                peaks={currentBeat.waveformPeaks}
                progress={duration > 0 ? currentTime / duration : 0}
                onSeek={(fraction) => seek(fraction * duration)}
                lockedFraction={previewLimitSec && duration > 0 ? previewLimitSec / duration : null}
              />
            </div>
            <span className="w-9 shrink-0 text-[11px] tabular-nums text-muted-2">
              {formatDuration(duration)}
            </span>
          </div>
          {previewLimitSec != null && (
            <span className="flex items-center gap-1 text-[10px] text-muted-2">
              <Lock size={9} />
              {previewLimitSec}s preview — full track requires purchase
            </span>
          )}
        </div>

        {/* Volume + close */}
        <div className="hidden items-center gap-2 sm:flex sm:w-40 sm:justify-end">
          <button
            onClick={() => {
              if (volume > 0) {
                setPrevVolume(volume);
                setVolume(0);
              } else {
                setVolume(prevVolume || 0.8);
              }
            }}
            className="text-muted transition hover:text-foreground"
            aria-label={volume === 0 ? "Unmute" : "Mute"}
          >
            <VolumeIcon size={16} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-20"
            style={{
              background: `linear-gradient(to right, var(--foreground) ${volume * 100}%, var(--border) ${volume * 100}%)`,
            }}
            aria-label="Volume"
          />
        </div>

        <button
          onClick={closePlayer}
          className={cn(
            "shrink-0 text-muted-2 transition hover:text-foreground",
            "hidden sm:block"
          )}
          aria-label="Close player"
        >
          <X size={16} />
        </button>
      </div>

      {/* mobile progress bar */}
      <div className="h-0.5 w-full bg-border sm:hidden">
        <div
          className="h-full bg-accent transition-[width]"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
