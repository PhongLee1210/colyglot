import { describe, expect, test } from "bun:test";

import { ReviewGrade } from "@colyglot/srs";

import type { BedView } from "@/lib/game/types";
import { cropStage, waitSpan, wiltIntensity } from "./crops";
import {
  applyStreakBonus,
  baseHarvestGold,
  expandBedCost,
  GRADUATION_INTERVAL_DAYS,
  graduationThreshold,
  harvestGold,
  harvestPreview,
  streakBonusRate,
} from "./economy";
import { pickPlantingBed } from "./planting";

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

  test("graduation threshold sits at the 21-day memory mark", () => {
    expect(GRADUATION_INTERVAL_DAYS).toBe(21);
  });

  test("the first tree graduates at 15 days exactly once (GAME_PLAY §10.2)", () => {
    expect(graduationThreshold(false)).toBe(15);
    expect(graduationThreshold(true)).toBe(21);
  });

  test("streak bonuses step at 3 / 7 / 30 days (GAME_PLAY §6.4)", () => {
    expect(streakBonusRate(0)).toBe(0);
    expect(streakBonusRate(2)).toBe(0);
    expect(streakBonusRate(3)).toBe(0.1);
    expect(streakBonusRate(6)).toBe(0.1);
    expect(streakBonusRate(7)).toBe(0.2);
    expect(streakBonusRate(29)).toBe(0.2);
    expect(streakBonusRate(30)).toBe(0.3);
  });

  test("the sweep bonus rounds onto the session gold", () => {
    expect(applyStreakBonus(50, 3)).toBe(5);
    expect(applyStreakBonus(50, 7)).toBe(10);
    expect(applyStreakBonus(50, 30)).toBe(15);
    expect(applyStreakBonus(50, 1)).toBe(0);
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

describe("wiltIntensity", () => {
  const now = new Date("2026-09-27T12:00:00Z");
  const schedule = (ratio: number) => ({
    dueAt: new Date(now.getTime() - ratio * 10 * DAY),
    intervalDays: 10,
  });

  test("grows proportionally with the overdue ratio (GAME_PLAY §4)", () => {
    expect(
      wiltIntensity(
        { dueAt: new Date(now.getTime() + DAY), intervalDays: 1 },
        now
      )
    ).toBe(0);
    expect(wiltIntensity(schedule(0.5), now)).toBe(0);
    expect(wiltIntensity(schedule(1), now)).toBe(0);
    expect(wiltIntensity(schedule(2), now)).toBe(0.5);
    expect(wiltIntensity(schedule(3), now)).toBe(1);
    expect(wiltIntensity(schedule(9), now)).toBe(1);
  });

  test("no schedule never wilts", () => {
    expect(wiltIntensity(null, now)).toBe(0);
  });
});

describe("waitSpan", () => {
  const now = new Date("2026-09-27T12:00:00Z");

  test("names the unit the countdown reads in", () => {
    expect(waitSpan(new Date(now.getTime() + 90 * 60 * 1000), now)).toEqual({
      unit: "hours",
      hours: 1,
      minutes: 30,
    });
    expect(waitSpan(new Date(now.getTime() + 45 * 60 * 1000), now)).toEqual({
      unit: "minutes",
      minutes: 45,
    });
    expect(waitSpan(new Date(now.getTime() + 3 * DAY), now)).toEqual({
      unit: "days",
      days: 3,
    });
    expect(waitSpan(new Date(now.getTime() - 1000), now)).toEqual({
      unit: "now",
    });
  });
});

describe("pickPlantingBed", () => {
  const bed = (
    id: string,
    regionKey: "homestead" | "market",
    filled: number,
    plotCount = 6,
    kind: "garden" | "greenhouse" = "garden"
  ): BedView => ({
    id,
    deckId: `deck-${id}`,
    name: id,
    plotCount,
    position: 0,
    kind,
    regionKey,
    plots: Array.from({ length: plotCount }, (_, slotIndex) => ({
      slotIndex,
      cardId: slotIndex < filled ? `card-${id}-${slotIndex}` : null,
      hanzi: slotIndex < filled ? "你" : null,
      pinyin: null,
      translation: null,
      plantedAt: null,
      variant: 0,
      schedule: null,
    })),
  });

  test("seeds land in their own region's first bed with a free slot", () => {
    const beds = [
      bed("h1", "homestead", 6),
      bed("m1", "market", 2),
      bed("m2", "market", 0, 12),
    ];
    expect(pickPlantingBed(beds, "market")?.id).toBe("m1");
    expect(pickPlantingBed(beds, "homestead")?.id).toBe("h1");
  });

  test("a full first bed spills to the region's next bed, then falls back", () => {
    const beds = [bed("h1", "homestead", 6), bed("h2", "homestead", 1)];
    expect(pickPlantingBed(beds, "homestead")?.id).toBe("h2");
    expect(pickPlantingBed([bed("h1", "homestead", 6)], "homestead")?.id).toBe(
      "h1"
    );
  });

  test("the greenhouse never takes seeds; unknown region has no bed", () => {
    const beds = [bed("g1", "homestead", 0, 3, "greenhouse")];
    expect(pickPlantingBed(beds, "homestead")).toBeUndefined();
  });
});
