import { describe, expect, test } from "bun:test";

import {
  computeStreak,
  msUntilNextUtcDay,
  startOfUtcDay,
  toUtcDayKey,
} from "../streak";

const NOW = new Date("2026-09-24T15:00:00Z");

describe("computeStreak", () => {
  test("returns 0 when there are no review days", () => {
    expect(computeStreak([], NOW)).toBe(0);
  });

  test("day-1 study counts as 1", () => {
    expect(computeStreak(["2026-09-24"], NOW)).toBe(1);
  });

  test("yesterday-only study still counts as 1 (timezone grace)", () => {
    expect(computeStreak(["2026-09-23"], NOW)).toBe(1);
  });

  test("two consecutive days count as 2", () => {
    expect(computeStreak(["2026-09-23", "2026-09-24"], NOW)).toBe(2);
  });

  test("a gap day resets the streak to 0 from today", () => {
    expect(computeStreak(["2026-09-22", "2026-09-21"], NOW)).toBe(0);
  });

  test("gap before today keeps only the run ending today", () => {
    expect(computeStreak(["2026-09-20", "2026-09-23", "2026-09-24"], NOW)).toBe(
      2
    );
  });

  test("multiple sessions on the same day increment once", () => {
    expect(computeStreak(["2026-09-24", "2026-09-24", "2026-09-24"], NOW)).toBe(
      1
    );
  });

  test("long run walks back day by day", () => {
    const days = Array.from({ length: 7 }, (_, index) =>
      toUtcDayKey(new Date(NOW.getTime() - index * 24 * 60 * 60 * 1000))
    );
    expect(computeStreak(days, NOW)).toBe(7);
  });
});

describe("UTC day boundaries", () => {
  test("startOfUtcDay truncates to midnight UTC", () => {
    expect(startOfUtcDay(NOW).toISOString()).toBe("2026-09-24T00:00:00.000Z");
  });

  test("msUntilNextUtcDay counts down to the next UTC midnight", () => {
    expect(msUntilNextUtcDay(NOW)).toBe(9 * 60 * 60 * 1000);
  });

  test("msUntilNextUtcDay is a full day exactly at midnight", () => {
    expect(msUntilNextUtcDay(new Date("2026-09-24T00:00:00.000Z"))).toBe(
      24 * 60 * 60 * 1000
    );
  });
});
