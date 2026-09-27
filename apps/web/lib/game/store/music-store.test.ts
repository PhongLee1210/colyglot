import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import {
  bindMusicPersistence,
  flushMusicPersist,
  resetMusicPersistenceForTests,
  scheduleMusicPersist,
  useMusicStore,
} from "./music-store";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  resetMusicPersistenceForTests();
  useMusicStore.setState({ volume: 20, muted: false, hydrated: false });
});

afterEach(() => {
  resetMusicPersistenceForTests();
});

describe("music store state", () => {
  test("hydrate applies server settings", () => {
    useMusicStore.getState().hydrate({ volume: 64, muted: true });
    expect(useMusicStore.getState().volume).toBe(64);
    expect(useMusicStore.getState().muted).toBe(true);
    expect(useMusicStore.getState().hydrated).toBe(true);
  });

  test("setVolume clamps into the valid range", () => {
    useMusicStore.getState().setVolume(140);
    expect(useMusicStore.getState().volume).toBe(100);
    useMusicStore.getState().setVolume(-3);
    expect(useMusicStore.getState().volume).toBe(0);
  });
});

describe("music persistence", () => {
  test("scheduling twice collapses into one last-write-wins save", async () => {
    const persist = mock(() => Promise.resolve({ ok: true }));
    bindMusicPersistence(persist);

    scheduleMusicPersist({ volume: 35, muted: false }, 50);
    scheduleMusicPersist({ volume: 48, muted: false }, 50);

    await sleep(10);
    expect(persist).toHaveBeenCalledTimes(0);
    await sleep(100);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ volume: 48, muted: false });
  });

  test("setVolume routes through the debounced schedule", () => {
    const persist = mock(() => Promise.resolve({ ok: true }));
    bindMusicPersistence(persist);

    useMusicStore.getState().setVolume(77);
    flushMusicPersist();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ volume: 77, muted: false });
  });

  test("setMuted supersedes a pending volume save and persists immediately", async () => {
    const persist = mock(() => Promise.resolve({ ok: true }));
    bindMusicPersistence(persist);

    useMusicStore.getState().setVolume(60);
    useMusicStore.getState().setMuted(true);

    await sleep(10);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ volume: 60, muted: true });
  });

  test("flushMusicPersist saves without waiting for the debounce", () => {
    const persist = mock(() => Promise.resolve({ ok: true }));
    bindMusicPersistence(persist);

    scheduleMusicPersist({ volume: 90, muted: false }, 5_000);
    flushMusicPersist();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ volume: 90, muted: false });
  });

  test("a failed save is swallowed", async () => {
    const persist = mock(() => Promise.reject(new Error("offline")));
    bindMusicPersistence(persist);

    useMusicStore.getState().setVolume(31);
    flushMusicPersist();
    await sleep(1);

    expect(persist).toHaveBeenCalledTimes(1);
  });
});
