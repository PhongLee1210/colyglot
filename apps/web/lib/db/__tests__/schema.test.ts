import { describe, expect, test } from "bun:test";

import {
  farmHarvestClaims,
  farmWorlds,
  isValidReviewGrade,
  levelFromXp,
  ReviewGrade,
} from "../schema";

describe("farm defaults", () => {
  test("starts every farmer with 40 gold on tier 0", () => {
    expect(farmWorlds.gold.default).toBe(40);
    expect(farmWorlds.tier.default).toBe(0);
    expect(farmHarvestClaims.sessionId.primary).toBe(true);
  });
});

describe("isValidReviewGrade", () => {
  test("accepts every grade in the 1-5 range", () => {
    expect(isValidReviewGrade(ReviewGrade.FORGOT)).toBe(true);
    expect(isValidReviewGrade(ReviewGrade.HARD)).toBe(true);
    expect(isValidReviewGrade(ReviewGrade.GOOD)).toBe(true);
    expect(isValidReviewGrade(ReviewGrade.EASY)).toBe(true);
    expect(isValidReviewGrade(ReviewGrade.PERFECT)).toBe(true);
  });

  test("rejects out-of-range and non-integer values", () => {
    expect(isValidReviewGrade(0)).toBe(false);
    expect(isValidReviewGrade(6)).toBe(false);
    expect(isValidReviewGrade(-1)).toBe(false);
    expect(isValidReviewGrade(2.5)).toBe(false);
    expect(isValidReviewGrade(Number.NaN)).toBe(false);
  });
});

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
