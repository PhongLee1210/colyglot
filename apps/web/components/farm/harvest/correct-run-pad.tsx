"use client";

import { useEffect } from "react";

import {
  setPadLayerVolume,
  startPadLayer,
  stopPadLayer,
} from "@/lib/game/audio/pad-layer";
import { CORRECT_RUN_FOR_PAD } from "@/lib/game/core/challenge";
import { effectiveMusicVolume, MUSIC_VOLUME_MAX } from "@/lib/game/music";
import { useFxStore } from "@/lib/game/store/fx-store";
import { useMusicStore } from "@/lib/game/store/music-store";

// Renders nothing: translates a 5+ correct run (GAME_PLAY §8.3) into a
// soft WebAudio pad under the music, honoring the music volume settings,
// and releases it when the run breaks or the session unmounts.
export function CorrectRunPad() {
  const correctRun = useFxStore((state) => state.correctRun);
  const volume = useMusicStore((state) => state.volume);
  const muted = useMusicStore((state) => state.muted);

  useEffect(() => {
    if (correctRun >= CORRECT_RUN_FOR_PAD) {
      startPadLayer();
    } else {
      stopPadLayer();
    }
  }, [correctRun]);

  useEffect(() => {
    setPadLayerVolume(
      effectiveMusicVolume({ volume, muted }) / MUSIC_VOLUME_MAX
    );
  }, [volume, muted]);

  useEffect(() => () => stopPadLayer(), []);

  return null;
}
