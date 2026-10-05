import { describe, expect, test } from "bun:test";

import { LOADING_STEP_COUNT, loadingStepIndex } from "./loading-steps";

describe("loadingStepIndex", () => {
  test("starts at the first step", () => {
    expect(loadingStepIndex(0)).toBe(0);
  });

  test("clamps out-of-range progress", () => {
    expect(loadingStepIndex(-20)).toBe(0);
    expect(loadingStepIndex(140)).toBe(LOADING_STEP_COUNT - 1);
  });

  test("advances monotonically to the last step", () => {
    const indexes = [0, 10, 35, 55, 80, 99, 100].map(loadingStepIndex);
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes);
    expect(indexes[indexes.length - 1]).toBe(LOADING_STEP_COUNT - 1);
  });
});
