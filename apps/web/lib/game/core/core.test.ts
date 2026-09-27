import { describe, expect, test } from "bun:test";

import { ReviewGrade } from "@colyglot/srs";

import { cropStage, formatWait } from "./crops";
import {
  baseHarvestGold,
  expandBedCost,
  harvestGold,
  harvestPreview,
} from "./economy";

const DAY = 24 * 60 * 60 * 1000;

describe("economy", () => {
  test("base gold scales with pre-review interval, capped at 60 days", () => {
    expect(baseHarvestGold(0)).toBe(2);
    expect(baseHarvestGold(1)).toBe(3);
    expect(baseHarvestGold(6)).toBe(8);
    expect(baseHarvestGold(30)).toBe(32);
    expect(baseHarvestGold(60)).toBe(62);
    expect(baseHarvestGold(100)).toBe(62);
    expect(baseHarvestGold(-5)).toBe(2);
  });

  test("grade multipliers reward strong recall", () => {
    expect(harvestGold(6, ReviewGrade.GOOD)).toBe(8);
    expect(harvestGold(30, ReviewGrade.FORGOT)).toBe(8);
    expect(harvestGold(0, ReviewGrade.EASY)).toBe(3);
    expect(harvestGold(1, ReviewGrade.PERFECT)).toBe(5);
    expect(harvestGold(6, ReviewGrade.HARD)).toBe(6);
  });

  test("expansion cost steps 20 / 40 / 60", () => {
    expect(expandBedCost(6)).toBe(20);
    expect(expandBedCost(9)).toBe(40);
    expect(expandBedCost(12)).toBe(60);
  });

  test("preview exposes the base × multiplier math the UI shows", () => {
    expect(harvestPreview(6, ReviewGrade.PERFECT)).toEqual({
      base: 8,
      multiplier: 1.5,
      total: 12,
    });
    expect(harvestPreview(0, ReviewGrade.FORGOT)).toEqual({
      base: 2,
      multiplier: 0.25,
      total: 1,
    });
    expect(harvestPreview(60, ReviewGrade.GOOD)).toEqual({
      base: 62,
      multiplier: 1,
      total: 62,
    });
  });
});

describe("cropStage", () => {
  const now = new Date("2026-09-27T12:00:00Z");

  test("no schedule means fresh seedling", () => {
    expect(cropStage(null, now)).toBe("fresh");
  });

  test("future due date means growing", () => {
    expect(
      cropStage({ dueAt: new Date(now.getTime() + DAY), intervalDays: 1 }, now)
    ).toBe("growing");
  });

  test("recently due means ready", () => {
    expect(
      cropStage(
        { dueAt: new Date(now.getTime() - DAY / 2), intervalDays: 10 },
        now
      )
    ).toBe("ready");
  });

  test("overdue by a full interval means urgent", () => {
    expect(
      cropStage(
        { dueAt: new Date(now.getTime() - 15 * DAY), intervalDays: 10 },
        now
      )
    ).toBe("urgent");
  });
});

describe("formatWait", () => {
  const now = new Date("2026-09-27T12:00:00Z");

  test("renders human countdown", () => {
    expect(formatWait(new Date(now.getTime() + 90 * 60 * 1000), now)).toBe(
      "1h 30m"
    );
    expect(formatWait(new Date(now.getTime() + 45 * 60 * 1000), now)).toBe(
      "45m"
    );
    expect(formatWait(new Date(now.getTime() + 3 * DAY), now)).toBe("3d");
    expect(formatWait(new Date(now.getTime() - 1000), now)).toBe("now");
  });
});
