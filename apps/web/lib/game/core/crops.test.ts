import { describe, expect, test } from "bun:test";

import { daysToGraduation, nearGraduation } from "./crops";

const DAY_MS = 86_400_000;

describe("nearGraduation", () => {
  test("lights up from 14d until the 21d graduation threshold", () => {
    expect(nearGraduation(null)).toBeFalse();
    expect(nearGraduation({ dueAt: new Date(), intervalDays: 13 })).toBeFalse();
    expect(nearGraduation({ dueAt: new Date(), intervalDays: 14 })).toBeTrue();
    expect(nearGraduation({ dueAt: new Date(), intervalDays: 20 })).toBeTrue();
    expect(nearGraduation({ dueAt: new Date(), intervalDays: 21 })).toBeFalse();
  });
});

describe("daysToGraduation", () => {
  test("counts whole days until the graduating review, min 1", () => {
    const now = new Date("2026-09-30T00:00:00Z");
    const due = (days: number) => new Date(now.getTime() + days * DAY_MS);
    expect(daysToGraduation({ dueAt: due(3), intervalDays: 18 }, now)).toBe(3);
    // Already due today still says 1 — the review might graduate it now.
    expect(daysToGraduation({ dueAt: due(-0.5), intervalDays: 15 }, now)).toBe(
      1
    );
    expect(
      daysToGraduation({ dueAt: due(3), intervalDays: 9 }, now)
    ).toBeNull();
  });
});
