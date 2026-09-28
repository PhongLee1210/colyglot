import { describe, expect, test } from "bun:test";

import {
  CROP_SWAY,
  FX_DURATIONS,
  clamp01,
  easeInCubic,
  easeOutCubic,
  easeOutQuad,
  fxProgress,
  harvestRise,
  harvestScale,
  harvestSpin,
  morphInScale,
  morphOutScale,
  popInScale,
  readyBreath,
  swayX,
  swayZ,
} from "@/lib/game/3d/animation";

describe("easings", () => {
  test("anchors are exact at 0 and 1", () => {
    for (const ease of [easeInCubic, easeOutCubic, easeOutQuad]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
    }
  });

  test("midpoints match their curves", () => {
    expect(easeInCubic(0.5)).toBe(0.125);
    expect(easeOutCubic(0.5)).toBe(0.875);
    expect(easeOutQuad(0.5)).toBe(0.75);
  });

  test("clamp01 saturates outside the unit interval", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
  });
});

describe("fxProgress", () => {
  test("is 0 at trigger and 1 at the duration boundary", () => {
    expect(fxProgress(0, 800, 1)).toBe(0);
    expect(fxProgress(400, 800, 1)).toBe(0.5);
    expect(fxProgress(800, 800, 1)).toBe(1);
    expect(fxProgress(900, 800, 1)).toBe(1);
  });

  test("reduced motion collapses every transition instantly", () => {
    expect(fxProgress(0, 800, 0)).toBe(1);
    expect(fxProgress(0, 420, 0)).toBe(1);
  });
});

describe("popInScale", () => {
  test("starts at 0 and settles at 1", () => {
    expect(popInScale(0)).toBe(0);
    expect(popInScale(1)).toBeCloseTo(1);
  });

  test("overshoots past 1.15 mid-flight and never exceeds 1.3", () => {
    let peak = 0;
    for (let i = 0; i <= 100; i++) {
      peak = Math.max(peak, popInScale(i / 100));
    }
    expect(peak).toBeGreaterThan(1.15);
    expect(peak).toBeLessThan(1.3);
  });
});

describe("harvest ghost curves", () => {
  test("swells to 1.5 by 70% then collapses to 0", () => {
    expect(harvestScale(0)).toBe(1);
    expect(harvestScale(0.7)).toBeCloseTo(1.5);
    expect(harvestScale(1)).toBe(0);
    expect(harvestScale(0.5)).toBeGreaterThan(1);
  });

  test("rise and spin are monotonic and finish at their peaks", () => {
    expect(harvestRise(0)).toBe(0);
    expect(harvestRise(1)).toBeCloseTo(1.8);
    expect(harvestSpin(0)).toBe(0);
    expect(harvestSpin(1)).toBeCloseTo(Math.PI * 2.5);
    expect(harvestSpin(0.8)).toBeGreaterThan(harvestSpin(0.2));
  });
});

describe("stage morph", () => {
  test("old shrinks to 0 by half, new grows from 0 at half to 1", () => {
    expect(morphOutScale(0)).toBe(1);
    expect(morphOutScale(0.5)).toBe(0);
    expect(morphInScale(0.5)).toBe(0);
    expect(morphInScale(1)).toBe(1);
    expect(morphInScale(0.25)).toBe(0);
  });
});

describe("idle motion", () => {
  test("ready breath stays within a subtle band", () => {
    expect(readyBreath(0, 0)).toBe(1);
    const low = readyBreath((3 * Math.PI) / 4.8, 0);
    const high = readyBreath(Math.PI / 4.8, 0);
    expect(low).toBeCloseTo(0.96, 2);
    expect(high).toBeCloseTo(1.04, 2);
  });

  test("sway scales with amplitude and shifts with phase", () => {
    const config = CROP_SWAY.ready;
    expect(swayX(0, 0, config)).toBe(0);
    expect(swayX(0, Math.PI / 2, config)).toBeCloseTo(config.amplitude);
    const doubled = { amplitude: config.amplitude * 2, speed: config.speed };
    expect(swayX(Math.PI / 2 / config.speed, 0, doubled)).toBeCloseTo(
      config.amplitude * 2
    );
    expect(swayZ(0, 0, config)).toBeCloseTo(config.amplitude * 0.6);
  });

  test("every crop stage has a distinct sway config", () => {
    const speeds = Object.values(CROP_SWAY).map((config) => config.speed);
    expect(new Set(speeds).size).toBe(speeds.length);
  });
});

describe("durations", () => {
  test("match the agreed feel calibration", () => {
    expect(FX_DURATIONS.plant).toBe(420);
    expect(FX_DURATIONS.harvest).toBe(800);
    expect(FX_DURATIONS.stageShift).toBe(400);
    expect(FX_DURATIONS.expansion).toBe(300);
    expect(FX_DURATIONS.coinFlight).toBe(1150);
    expect(FX_DURATIONS.coinStagger).toBe(65);
  });
});
