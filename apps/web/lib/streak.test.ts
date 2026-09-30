import { describe, expect, test } from "bun:test";

import { longestStreak } from "./streak";

describe("longestStreak", () => {
  test("finds the best consecutive run across all history", () => {
    expect(
      longestStreak([
        "2026-09-01",
        "2026-09-02",
        "2026-09-03",
        // gap
        "2026-09-07",
        "2026-09-08",
        // gap
        "2026-09-20",
        "2026-09-21",
        "2026-09-22",
        "2026-09-23",
        "2026-09-24",
      ])
    ).toBe(5);
  });

  test("handles duplicates, single days, and empty history", () => {
    expect(longestStreak(["2026-09-01", "2026-09-01", "2026-09-02"])).toBe(2);
    expect(longestStreak(["2026-09-01"])).toBe(1);
    expect(longestStreak([])).toBe(0);
  });
});
