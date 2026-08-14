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
import { usePlayer } from "@/components/player/PlayerContext";

interface AmbientTrack {
  title: string;
  src: string;
}

const AMBIENT_TRACKS: AmbientTrack[] = [
  { title: "Bad Decisions", src: "/sounds/ambient/bad-decisions.wav" },
  { title: "Cascade", src: "/sounds/ambient/cascade.wav" },
  { title: "Floating", src: "/sounds/ambient/floating.wav" },
  { title: "Solstice", src: "/sounds/ambient/solstice.wav" },
  { title: "Disco Nights", src: "/sounds/ambient/disco-nights.wav" },
  { title: "Bless The Beat", src: "/sounds/ambient/bless-the-beat.m4a" },
  { title: "Blue Eyes", src: "/sounds/ambient/blue-eyes.m4a" },
  { title: "Dirty Nine", src: "/sounds/ambient/dirty-nine.m4a" },
];

const DEFAULT_VOLUME = 0.4;
// These ambient files are short melody loops (30s-2min). Replaying each one
// a few times before shuffling keeps transitions from feeling too frequent.
const PLAYS_PER_TRACK = 3;

/** Random index into AMBIENT_TRACKS, avoiding an immediate repeat of `exclude` when possible. */
function pickRandomIndex(exclude?: number): number {
  if (AMBIENT_TRACKS.length <= 1) return 0;
  let index = Math.floor(Math.random() * AMBIENT_TRACKS.length);
  while (index === exclude) {
    index = Math.floor(Math.random() * AMBIENT_TRACKS.length);
  }
  return index;
}

interface BackgroundMusicContextValue {
  isPlaying: boolean;
  isRepeating: boolean;
  volume: number;
  currentTrack: AmbientTrack;
  togglePlay: () => void;
  stop: () => void;
  toggleRepeat: () => void;
  setVolume: (volume: number) => void;
}

const BackgroundMusicContext = createContext<BackgroundMusicContextValue | null>(null);

export function BackgroundMusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackIndexRef = useRef(0);
  const playsRemainingRef = useRef(PLAYS_PER_TRACK);
  const isRepeatingRef = useRef(false);
  // Tracks whether the user (or the beat-conflict auto-pause) currently wants
  // ambient music silent, so a leftover "unlock autoplay" gesture listener
  // can't resurrect playback out from under an intentional pause.
  const suppressedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [trackIndex, setTrackIndex] = useState(0);

  const { isPlaying: beatIsPlaying } = usePlayer();
  const beatIsPlayingRef = useRef(beatIsPlaying);

  useEffect(() => {
    beatIsPlayingRef.current = beatIsPlaying;
  }, [beatIsPlaying]);

  useEffect(() => {
    // Guards against a real race: if this effect is torn down (e.g. React
    // Strict Mode's dev-only mount→cleanup→mount cycle) while the initial
    // play() promise is still pending, the .catch() below would otherwise
    // register its click-listener *after* cleanup already ran — leaking an
    // orphaned Audio tied to a stray document listener that a later click
    // resurrects, causing two tracks to audibly overlap.
    let cancelled = false;

    const startIndex = pickRandomIndex();
    trackIndexRef.current = startIndex;
    setTrackIndex(startIndex);
    playsRemainingRef.current = PLAYS_PER_TRACK;

    const audio = new Audio(AMBIENT_TRACKS[startIndex].src);
    audio.volume = DEFAULT_VOLUME;
    audio.preload = "auto";
    audioRef.current = audio;

    // Warm the browser's cache for whichever track is coming up next, so the
    // handoff at "ended" doesn't stall on a fresh network fetch.
    let preloadAudio: HTMLAudioElement | null = null;
    function warmNext(afterIndex: number) {
      const nextIndex = pickRandomIndex(afterIndex);
      preloadAudio = new Audio(AMBIENT_TRACKS[nextIndex].src);
      preloadAudio.preload = "auto";
      preloadAudio.load();
      return nextIndex;
    }
    let pendingNextIndex = warmNext(startIndex);

    function advanceTrack() {
      if (isRepeatingRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }

      playsRemainingRef.current -= 1;
      if (playsRemainingRef.current > 0) {
        // Same track, another lap — keeps it around for a few plays instead
        // of shuffling every single time it ends.
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }

      // Seamless shuffle: no fixed order, never the same track twice in a
      // row, and the next file is already pre-fetched from warmNext().
      const nextIndex = pendingNextIndex;
      trackIndexRef.current = nextIndex;
      setTrackIndex(nextIndex);
      playsRemainingRef.current = PLAYS_PER_TRACK;
      audio.src = AMBIENT_TRACKS[nextIndex].src;
      audio.currentTime = 0;
      audio.play().catch(() => {});
      pendingNextIndex = warmNext(nextIndex);
    }
    audio.addEventListener("ended", advanceTrack);

    // A page-load autoplay attempt with no prior user gesture may be blocked
    // by the browser. If so, arm a one-shot listener that retries on the
    // visitor's first interaction — but only if nothing has since asked for
    // silence (an explicit pause/stop, or a beat starting up).
    function unlockAutoplay() {
      if (cancelled || suppressedRef.current || beatIsPlayingRef.current) return;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }

    audio
      .play()
      .then(() => {
        if (!cancelled) setIsPlaying(true);
      })
      .catch(() => {
        if (cancelled) return;
        document.addEventListener("click", unlockAutoplay, { once: true });
        document.addEventListener("keydown", unlockAutoplay, { once: true });
        document.addEventListener("touchstart", unlockAutoplay, { once: true });
      });

    return () => {
      cancelled = true;
      audio.removeEventListener("ended", advanceTrack);
      document.removeEventListener("click", unlockAutoplay);
      document.removeEventListener("keydown", unlockAutoplay);
      document.removeEventListener("touchstart", unlockAutoplay);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    if (beatIsPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [beatIsPlaying]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      suppressedRef.current = false;
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      suppressedRef.current = true;
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    suppressedRef.current = true;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  }, []);

  const toggleRepeat = useCallback(() => {
    setIsRepeating((prev) => {
      const next = !prev;
      isRepeatingRef.current = next;
      return next;
    });
  }, []);

  const setVolume = useCallback((next: number) => {
    setVolumeState(next);
    if (audioRef.current) audioRef.current.volume = next;
  }, []);

  const value = useMemo<BackgroundMusicContextValue>(
    () => ({
      isPlaying,
      isRepeating,
      volume,
      currentTrack: AMBIENT_TRACKS[trackIndex],
      togglePlay,
      stop,
      toggleRepeat,
      setVolume,
    }),
    [isPlaying, isRepeating, volume, trackIndex, togglePlay, stop, toggleRepeat, setVolume]
  );

  return (
    <BackgroundMusicContext.Provider value={value}>{children}</BackgroundMusicContext.Provider>
  );
}

export function useBackgroundMusic() {
  const ctx = useContext(BackgroundMusicContext);
  if (!ctx) throw new Error("useBackgroundMusic must be used within BackgroundMusicProvider");
  return ctx;
}
