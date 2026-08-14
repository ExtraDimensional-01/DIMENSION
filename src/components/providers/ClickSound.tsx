"use client";

import { useEffect } from "react";

const CLICK_SOUND_SRC = "/sounds/ui-click.wav";
const CLICK_SOUND_VOLUME = 0.35;

export function ClickSound() {
  useEffect(() => {
    const audio = new Audio(CLICK_SOUND_SRC);
    audio.volume = CLICK_SOUND_VOLUME;
    audio.preload = "auto";

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("button, a")) return;

      const sound = audio.cloneNode(true) as HTMLAudioElement;
      sound.volume = CLICK_SOUND_VOLUME;
      sound.play().catch(() => {});
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
