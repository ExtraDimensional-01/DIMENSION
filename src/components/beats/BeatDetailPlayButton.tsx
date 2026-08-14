"use client";

import { Lock, Pause, Play } from "lucide-react";
import { usePlayer } from "@/components/player/PlayerContext";
import type { BeatSummary } from "@/types";
import { cn } from "@/lib/utils";

export function BeatDetailPlayButton({ beat }: { beat: BeatSummary }) {
  const { currentBeat, isPlaying, previewLimitSec, playBeat, togglePlay } = usePlayer();
  const isCurrent = currentBeat?.id === beat.id;
  const showPause = isCurrent && isPlaying;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => (isCurrent ? togglePlay() : playBeat(beat, [beat]))}
        className={cn(
          "flex items-center gap-2.5 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent-hover hover:scale-[1.02] active:scale-95"
        )}
      >
        {showPause ? (
          <Pause size={18} fill="currentColor" />
        ) : (
          <Play size={18} fill="currentColor" className="ml-0.5" />
        )}
        {showPause ? "Pause" : "Play preview"}
      </button>
      {isCurrent && previewLimitSec != null && (
        <span className="flex items-center gap-1 text-xs text-muted-2">
          <Lock size={11} />
          {previewLimitSec}s preview — full track requires purchase
        </span>
      )}
    </div>
  );
}
