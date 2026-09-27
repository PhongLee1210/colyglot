"use client";

import { useEffect, useRef } from "react";

import { effectiveMusicVolume, MUSIC_TRACK_SRC } from "@/lib/game/music";
import { useMusicStore } from "@/lib/game/store/music-store";

export function GameMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const volume = useMusicStore((state) => state.volume);
  const muted = useMusicStore((state) => state.muted);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.muted = muted;
    audio.volume = effectiveMusicVolume({ volume, muted });
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    let unlock: (() => void) | null = null;
    audio.play().catch((error: unknown) => {
      // Browsers block unmuted autoplay until the first user gesture;
      // anything else (e.g. a missing track file) just stays silent.
      if (
        !(error instanceof DOMException) ||
        error.name !== "NotAllowedError"
      ) {
        return;
      }
      unlock = () => {
        void audio.play().catch(() => {});
      };
      window.addEventListener("pointerdown", unlock);
      window.addEventListener("keydown", unlock);
    });
    return () => {
      if (unlock) {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
      }
    };
  }, []);

  return (
    <audio
      ref={audioRef}
      src={MUSIC_TRACK_SRC}
      loop
      preload="auto"
      data-testid="game-music"
    />
  );
}
