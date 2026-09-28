import { describe, expect, test } from "bun:test";

import { levelFromXp } from "@/lib/xp";

describe("levelFromXp", () => {
  test("starts at level 1 with zero xp", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  test("stays level 1 until the first full 100 xp", () => {
    expect(levelFromXp(99)).toBe(1);
  });

  test("reaches level 2 at exactly 100 xp", () => {
    expect(levelFromXp(100)).toBe(2);
  });

  test("continues stepping every 100 xp", () => {
    expect(levelFromXp(250)).toBe(3);
    expect(levelFromXp(1200)).toBe(13);
  });
});
