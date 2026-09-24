import { describe, expect, test } from "bun:test";

import { isValidReviewGrade, ReviewGrade } from "../schema";

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
