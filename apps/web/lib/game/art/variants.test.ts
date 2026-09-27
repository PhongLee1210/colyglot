import { describe, expect, test } from "bun:test";

import { CROP_VARIANT_COUNT, cropVariant } from "./variants";

describe("cropVariant", () => {
  test("is deterministic and within range", () => {
    for (const seed of ["你好", "谢谢", "temp-你好", ""]) {
      const value = cropVariant(seed);
      expect(value).toBe(cropVariant(seed));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(CROP_VARIANT_COUNT);
    }
  });

  test("spreads real vocabulary across silhouettes", () => {
    const words = ["你好", "吃", "请", "吗", "茶", "是", "再见", "水"];
    const distinct = new Set(words.map(cropVariant));
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });
});
