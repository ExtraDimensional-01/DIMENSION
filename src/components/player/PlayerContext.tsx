"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import type { BeatSummary } from "@/types";

interface PlayerContextValue {
  currentBeat: BeatSummary | null;
  queue: BeatSummary[];
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  /** Seconds a restricted (non-producer, non-owner) listener may hear of the current beat, or null if unrestricted. */
  previewLimitSec: number | null;
  playBeat: (beat: BeatSummary, queue?: BeatSummary[]) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  playNext: () => void;
  playPrev: () => void;
  closePlayer: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export const SNIPPET_LIMIT_SEC = 25;

interface ListenerIdentity {
  userId?: string;
  role?: string;
}

/**
 * A beat is snippet-capped only for restricted listeners on a priced track:
 * the uploader always hears their own beat in full, and any producer account
 * hears everything in full (industry peers evaluating work). A viewer who
 * has a confirmed Order for this beat is also exempt — the seller unlocked
 * it for them. Everyone else (viewer accounts and logged-out visitors) is
 * capped at SNIPPET_LIMIT_SEC.
 */
function isCapped(beat: BeatSummary | null, listener: ListenerIdentity): boolean {
  if (!beat || beat.licenses.length === 0) return false;
  if (beat.unlockedForViewer) return false;
  if (listener.userId && beat.producer.id === listener.userId) return false;
  if (listener.role === "producer") return false;
  return true;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBeatIdRef = useRef<string | null>(null);
  const currentBeatRef = useRef<BeatSummary | null>(null);
  const listenerRef = useRef<ListenerIdentity>({});

  const [currentBeat, setCurrentBeat] = useState<BeatSummary | null>(null);
  const [queue, setQueue] = useState<BeatSummary[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);

  useEffect(() => {
    listenerRef.current = { userId: session?.user?.id, role: session?.user?.role };
  }, [session]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      const capped = isCapped(currentBeatRef.current, listenerRef.current);
      if (capped && audio.currentTime >= SNIPPET_LIMIT_SEC) {
        audio.pause();
        audio.currentTime = SNIPPET_LIMIT_SEC;
        setCurrentTime(SNIPPET_LIMIT_SEC);
        setIsPlaying(false);
        return;
      }
      setCurrentTime(audio.currentTime);
    };
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playBeat = useCallback((beat: BeatSummary, newQueue?: BeatSummary[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentBeatIdRef.current !== beat.id) {
      audio.src = beat.audioUrl;
      audio.load();
      setCurrentTime(0);
      setDuration(0);
      setIsLoading(true);
      fetch(`/api/beats/${beat.id}/play`, { method: "POST" }).catch(() => {});
    }

    currentBeatIdRef.current = beat.id;
    currentBeatRef.current = beat;
    setCurrentBeat(beat);
    if (newQueue) setQueue(newQueue);
    audio.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentBeat) return;
    if (audio.paused) {
      // Resuming a capped track that's already sitting at (or past) the limit
      // should restart from the top rather than silently refusing to play.
      const capped = isCapped(currentBeatRef.current, listenerRef.current);
      if (capped && audio.currentTime >= SNIPPET_LIMIT_SEC) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      audio.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentBeat]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const capped = isCapped(currentBeatRef.current, listenerRef.current);
    const clamped = capped ? Math.min(time, SNIPPET_LIMIT_SEC) : time;
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const setVolume = useCallback((v: number) => {
    const audio = audioRef.current;
    setVolumeState(v);
    if (audio) audio.volume = v;
  }, []);

  const playNext = useCallback(() => {
    if (!currentBeat || queue.length === 0) return;
    const idx = queue.findIndex((b) => b.id === currentBeat.id);
    const next = queue[idx + 1];
    if (next) playBeat(next, queue);
  }, [currentBeat, queue, playBeat]);

  const playPrev = useCallback(() => {
    if (!currentBeat || queue.length === 0) return;
    const idx = queue.findIndex((b) => b.id === currentBeat.id);
    const prev = queue[idx - 1];
    if (prev) playBeat(prev, queue);
  }, [currentBeat, queue, playBeat]);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    currentBeatIdRef.current = null;
    currentBeatRef.current = null;
    setCurrentBeat(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const previewLimitSec = useMemo(
    () =>
      isCapped(currentBeat, { userId: session?.user?.id, role: session?.user?.role })
        ? SNIPPET_LIMIT_SEC
        : null,
    [currentBeat, session?.user?.id, session?.user?.role]
  );

  return (
    <PlayerContext.Provider
      value={{
        currentBeat,
        queue,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        volume,
        previewLimitSec,
        playBeat,
        togglePlay,
        seek,
        setVolume,
        playNext,
        playPrev,
        closePlayer,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}
