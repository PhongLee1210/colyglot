export const MUSIC_TRACK_SRC = "/audio/a-breath-of-spring.m4a";

export const MUSIC_VOLUME_MIN = 0;
export const MUSIC_VOLUME_MAX = 100;

// A gentle default — the soundtrack sits under gameplay, not over it.
export const DEFAULT_MUSIC_VOLUME = 20;

export type MusicSettings = {
  volume: number;
  muted: boolean;
};

export function clampMusicVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return DEFAULT_MUSIC_VOLUME;
  }
  return Math.min(
    MUSIC_VOLUME_MAX,
    Math.max(MUSIC_VOLUME_MIN, Math.round(volume))
  );
}

export function effectiveMusicVolume({ volume, muted }: MusicSettings): number {
  return muted ? 0 : clampMusicVolume(volume) / MUSIC_VOLUME_MAX;
}
