import { create } from "zustand";

import {
  clampMusicVolume,
  DEFAULT_MUSIC_VOLUME,
  type MusicSettings,
} from "@/lib/game/music";

export const MUSIC_PERSIST_DEBOUNCE_MS = 800;

type MusicPersist = (settings: MusicSettings) => Promise<unknown>;

let persistFn: MusicPersist | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: MusicSettings | null = null;
let onPersist: (() => void) | null = null;

function runPendingPersist(): void {
  const settings = pending;
  const fn = persistFn;
  pending = null;
  if (!settings || !fn) {
    return;
  }
  void fn(settings)
    .then(() => {
      onPersist?.();
    })
    .catch(() => {
      // Settings sync is best-effort; the next change retries.
    });
}

export function bindMusicPersistence(fn: MusicPersist): void {
  persistFn = fn;
}

export function onMusicPersist(callback: () => void): void {
  onPersist = callback;
}

export function scheduleMusicPersist(
  settings: MusicSettings,
  delayMs = MUSIC_PERSIST_DEBOUNCE_MS
): void {
  pending = settings;
  if (timer !== null) {
    clearTimeout(timer);
  }
  timer = setTimeout(runPendingPersist, delayMs);
}

export function flushMusicPersist(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  runPendingPersist();
}

export function resetMusicPersistenceForTests(): void {
  if (timer !== null) {
    clearTimeout(timer);
  }
  timer = null;
  pending = null;
  persistFn = null;
}

type MusicStoreState = {
  volume: number;
  muted: boolean;
  hydrated: boolean;
  hydrate: (settings: MusicSettings) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
};

export const useMusicStore = create<MusicStoreState>((set, get) => ({
  volume: DEFAULT_MUSIC_VOLUME,
  muted: false,
  hydrated: false,
  hydrate: (settings) => set({ ...settings, hydrated: true }),
  setVolume: (volume) => {
    const next = clampMusicVolume(volume);
    set({ volume: next });
    scheduleMusicPersist({ volume: next, muted: get().muted });
  },
  setMuted: (muted) => {
    set({ muted });
    // Muting is a deliberate one-shot action — persist without the debounce.
    scheduleMusicPersist({ volume: get().volume, muted }, 0);
  },
}));
