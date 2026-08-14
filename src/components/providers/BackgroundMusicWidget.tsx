"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Repeat, Square, Volume1, Volume2, VolumeX } from "lucide-react";
import { useBackgroundMusic } from "@/components/providers/BackgroundMusicContext";
import { cn } from "@/lib/utils";

/**
 * Compact ambient-music control, lives in the navbar rather than as a
 * floating pill — the bottom PlayerBar (for beat playback) is the site's
 * one primary audio surface; this is a secondary, opt-in atmosphere toggle.
 */
export function BackgroundMusicWidget() {
  const { isPlaying, isRepeating, volume, currentTrack, togglePlay, stop, toggleRepeat, setVolume } =
    useBackgroundMusic();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-full border transition",
          isPlaying
            ? "border-accent/40 text-accent"
            : "border-border text-muted-2 hover:border-muted-2 hover:text-foreground"
        )}
        title={`Ambient music — ${currentTrack.title}`}
        aria-label="Ambient music controls"
      >
        {isPlaying && (
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
        )}
        <span className="relative flex h-3 w-3 items-end gap-[2px]">
          <span className={cn("w-[2px] bg-current", isPlaying ? "h-2 animate-pulse-glow" : "h-1")} />
          <span className={cn("w-[2px] bg-current", isPlaying ? "h-3" : "h-1.5")} />
          <span className={cn("w-[2px] bg-current", isPlaying ? "h-1.5" : "h-1")} />
        </span>
      </button>

      {open && (
        <div className="cut-corner-sm absolute right-0 top-full z-50 mt-2 w-60 animate-fade-in border border-border bg-surface/95 p-3.5 shadow-xl shadow-black/40 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="kicker text-[10px]">Ambience</span>
            <span className="truncate text-[11px] text-muted-2">{currentTrack.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:scale-105 active:scale-95"
              aria-label={isPlaying ? "Pause background music" : "Play background music"}
            >
              {isPlaying ? (
                <Pause size={13} fill="currentColor" />
              ) : (
                <Play size={13} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            <button
              onClick={stop}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-hover hover:text-foreground"
              aria-label="Stop background music"
            >
              <Square size={11} fill="currentColor" />
            </button>

            <button
              onClick={toggleRepeat}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
                isRepeating
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              )}
              aria-label={isRepeating ? "Disable repeat" : "Enable repeat"}
              aria-pressed={isRepeating}
            >
              <Repeat size={12} />
            </button>

            <div className="flex flex-1 items-center gap-1.5 pl-1">
              <VolumeIcon size={13} className="shrink-0 text-muted-2" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full"
                style={{
                  background: `linear-gradient(to right, var(--foreground) ${volume * 100}%, var(--border) ${volume * 100}%)`,
                }}
                aria-label="Background music volume"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
