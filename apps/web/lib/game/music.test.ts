import { describe, expect, test } from "bun:test";

import {
  clampMusicVolume,
  DEFAULT_MUSIC_VOLUME,
  effectiveMusicVolume,
} from "./music";

describe("clampMusicVolume", () => {
  test("keeps values inside the 0-100 range", () => {
    expect(clampMusicVolume(0)).toBe(0);
    expect(clampMusicVolume(55)).toBe(55);
    expect(clampMusicVolume(100)).toBe(100);
  });

  test("clamps out-of-range values", () => {
    expect(clampMusicVolume(-5)).toBe(0);
    expect(clampMusicVolume(150)).toBe(100);
  });

  test("rounds to whole percents", () => {
    expect(clampMusicVolume(55.4)).toBe(55);
    expect(clampMusicVolume(55.5)).toBe(56);
  });

  test("falls back to the default for non-finite input", () => {
    expect(clampMusicVolume(Number.NaN)).toBe(DEFAULT_MUSIC_VOLUME);
    expect(clampMusicVolume(Number.POSITIVE_INFINITY)).toBe(
      DEFAULT_MUSIC_VOLUME
    );
  });
});

describe("effectiveMusicVolume", () => {
  test("scales the percent into the audio element's 0-1 range", () => {
    expect(effectiveMusicVolume({ volume: 40, muted: false })).toBeCloseTo(0.4);
    expect(effectiveMusicVolume({ volume: 100, muted: false })).toBe(1);
  });

  test("silences when muted regardless of volume", () => {
    expect(effectiveMusicVolume({ volume: 80, muted: true })).toBe(0);
  });
});
