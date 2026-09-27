import { describe, expect, test } from "bun:test";

import { hexToRgb, mix, rgbToHex, shade } from "./palette";

describe("palette", () => {
  test("hex parsing handles 3 and 6 digit forms", () => {
    expect(hexToRgb("abc")).toEqual([170, 187, 204]);
    expect(hexToRgb("#808080")).toEqual([128, 128, 128]);
  });

  test("round trip", () => {
    expect(rgbToHex(hexToRgb("#7a5a33"))).toBe("#7a5a33");
  });

  test("shade darkens with negative, lightens with positive", () => {
    expect(shade("#808080", 0.5)).toBe("#c0c0c0");
    expect(shade("#808080", -0.5)).toBe("#404040");
    expect(shade("#ffffff", 1)).toBe("#ffffff");
    expect(shade("#000000", -1)).toBe("#000000");
  });

  test("mix interpolates", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#ff0000", "#0000ff", 0)).toBe("#ff0000");
  });
});
