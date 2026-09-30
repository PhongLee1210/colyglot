import { describe, expect, test } from "bun:test";

import type { BedView, FarmWorldSnapshot, PlotView } from "@/lib/game/types";
import { coachHint } from "./coach";

const NOW = new Date("2026-01-01T12:00:00Z");

function plot(overrides: Partial<PlotView> = {}): PlotView {
  return {
    slotIndex: 0,
    cardId: null,
    hanzi: null,
    pinyin: null,
    translation: null,
    plantedAt: null,
    variant: 0,
    schedule: null,
    ...overrides,
  };
}

function snapshot(
  plots: PlotView[],
  counts: { dueCount?: number; freshCount?: number } = {}
): FarmWorldSnapshot {
  const bed: BedView = {
    id: "bed-1",
    deckId: "deck-1",
    name: "Garden Bed",
    plotCount: plots.length,
    position: 0,
    kind: "garden",
    regionKey: "homestead",
    plots,
  };
  return {
    world: {
      id: "world-1",
      langKey: "zh-en",
      tier: 0,
      gold: 40,
      stats: { planted: 0, harvested: 0, goldEarned: 0 },
    },
    beds: [bed],
    items: [],
    forest: [],
    regions: [
      {
        key: "homestead",
        unlocked: true,
        goldGateMet: true,
        treesGateMet: true,
        mastered: false,
        masteryPct: 0,
      },
      {
        key: "market",
        unlocked: false,
        goldGateMet: false,
        treesGateMet: false,
        mastered: false,
        masteryPct: 0,
      },
    ],
    streak: 0,
    freshQueue: [],
    dueCount: counts.dueCount ?? 0,
    freshCount: counts.freshCount ?? 0,
    xp: 0,
    level: 1,
  };
}

describe("coachHint", () => {
  test("ripe crops outrank every other prompt", () => {
    const hint = coachHint(
      snapshot([plot()], { dueCount: 2, freshCount: 3 }),
      NOW
    );
    expect(hint).toBe("2 crops are ripe — harvest them to lock the words in");
  });

  test("new seedlings come next", () => {
    expect(coachHint(snapshot([plot()], { freshCount: 1 }), NOW)).toBe(
      "1 new seedling is waiting in the nursery"
    );
  });

  test("an untouched farm points at seeds", () => {
    expect(coachHint(snapshot([plot(), plot()]), NOW)).toBe(
      "Tap Seeds to plant your first words"
    );
  });

  test("empty ground asks for more planting", () => {
    const plots = [plot({ cardId: "card-1", hanzi: "水" }), plot()];
    expect(coachHint(snapshot(plots), NOW)).toBe(
      "1 plot is empty — plant another word"
    );
  });

  test("a full farm counts down to the next harvest", () => {
    const plots = [
      plot({
        cardId: "card-1",
        hanzi: "水",
        schedule: {
          dueAt: new Date(NOW.getTime() + 90 * 60 * 1000),
          intervalDays: 1,
          reviewCount: 1,
          lapses: 0,
        },
      }),
    ];
    expect(coachHint(snapshot(plots), NOW)).toBe(
      "Every plot is growing — next harvest in 1h 30m"
    );
  });
});
