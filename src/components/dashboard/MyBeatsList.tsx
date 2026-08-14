"use client";

import Link from "next/link";
import Image from "next/image";
import { EyeOff, Music2, Pause, Pencil, Play } from "lucide-react";
import type { BeatSummary } from "@/types";
import { usePlayer } from "@/components/player/PlayerContext";
import { DeleteBeatButton } from "@/components/beats/DeleteBeatButton";
import { formatRelativeDate, formatPrice } from "@/lib/utils";

export function MyBeatsList({ beats }: { beats: BeatSummary[] }) {
  const { currentBeat, isPlaying, playBeat, togglePlay } = usePlayer();

  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
      {beats.map((beat) => {
        const isCurrent = currentBeat?.id === beat.id;
        const showPause = isCurrent && isPlaying;

        return (
          <div
            key={beat.id}
            className="flex items-center gap-3 bg-surface px-4 py-3 transition hover:bg-surface-hover"
          >
            <button
              onClick={() => (isCurrent ? togglePlay() : playBeat(beat, beats))}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-foreground transition hover:text-accent"
              aria-label={showPause ? "Pause" : "Play"}
            >
              {showPause ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
            </button>

            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-background">
              {beat.coverUrl ? (
                <Image src={beat.coverUrl} alt="" fill sizes="40px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-2">
                  <Music2 size={14} />
                </div>
              )}
            </div>

            <Link href={`/beats/${beat.id}`} className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{beat.title}</p>
                {!beat.isPublic && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-2">
                    <EyeOff size={9} />
                    Unlisted
                  </span>
                )}
                {beat.startingPriceCents != null && (
                  <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    {beat.exclusiveSoldAt ? "Sold" : `From ${formatPrice(beat.startingPriceCents)}`}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-2">
                {beat.genre} · {beat.bpm} BPM · {beat.key}
              </p>
            </Link>

            <div className="hidden shrink-0 text-right text-xs text-muted-2 sm:block">
              <p>{beat.playCount.toLocaleString()} plays</p>
              <p>{formatRelativeDate(beat.createdAt)}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                href={`/dashboard/beats/${beat.id}/edit`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-hover hover:text-foreground"
                aria-label="Edit beat"
              >
                <Pencil size={14} />
              </Link>
              <DeleteBeatButton
                beatId={beat.id}
                redirectTo="/dashboard"
                label=""
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
