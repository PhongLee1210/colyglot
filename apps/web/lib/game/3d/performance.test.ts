import { describe, expect, test } from "bun:test";

import { classifyQualityTier, qualityConfig } from "./performance";

const BASE_SIGNALS = {
  devicePixelRatio: 2,
  hardwareConcurrency: 8,
  viewportWidth: 1280,
  viewportHeight: 800,
  prefersReducedMotion: false,
};

describe("classifyQualityTier", () => {
  test("reduced motion always degrades to low", () => {
    expect(
      classifyQualityTier({ ...BASE_SIGNALS, prefersReducedMotion: true })
    ).toBe("low");
  });

  test("few cores degrade to low", () => {
    expect(
      classifyQualityTier({ ...BASE_SIGNALS, hardwareConcurrency: 4 })
    ).toBe("low");
  });

  test("mid-range cores land on medium", () => {
    expect(
      classifyQualityTier({ ...BASE_SIGNALS, hardwareConcurrency: 6 })
    ).toBe("medium");
  });

  test("capable desktop hardware lands on high", () => {
    expect(classifyQualityTier(BASE_SIGNALS)).toBe("high");
  });

  test("small high-dpr screens step down to medium", () => {
    expect(
      classifyQualityTier({
        ...BASE_SIGNALS,
        viewportWidth: 390,
        viewportHeight: 844,
        devicePixelRatio: 3,
      })
    ).toBe("medium");
  });
});

describe("qualityConfig", () => {
  test("low tier disables shadows and caps dpr at 1", () => {
    const config = qualityConfig({
      ...BASE_SIGNALS,
      hardwareConcurrency: 4,
    });
    expect(config.tier).toBe("low");
    expect(config.shadowsEnabled).toBe(false);
    expect(config.dprCap).toBe(1);
  });

  test("high tier gets a 2048 shadow map", () => {
    expect(qualityConfig(BASE_SIGNALS).shadowMapSize).toBe(2048);
  });
});
