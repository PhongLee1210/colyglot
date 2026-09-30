import { describe, expect, test } from "bun:test";

import type { BedView } from "@/lib/game/types";

import { catTarget, chickenTarget } from "./animals";

function bed(
  id: string,
  plots: {
    slot: number;
    dueAt?: number;
    lapses?: number;
  }[],
  kind: "garden" | "greenhouse" = "garden"
): BedView {
  return {
    id,
    deckId: `deck-${id}`,
    name: id,
    plotCount: plots.length,
    position: 0,
    kind,
    regionKey: "homestead",
    plots: plots.map((plot) => ({
      slotIndex: plot.slot,
      cardId: plot.dueAt === undefined ? null : `card-${id}-${plot.slot}`,
      hanzi: null,
      pinyin: null,
      translation: null,
      plantedAt: null,
      variant: 0,
      schedule:
        plot.dueAt === undefined
          ? null
          : {
              dueAt: new Date(plot.dueAt),
              intervalDays: 3,
              reviewCount: 2,
              lapses: plot.lapses ?? 0,
            },
    })),
  };
}

describe("chickenTarget", () => {
  test("marks the soonest-due crop, overdue included", () => {
    const beds = [
      bed("a", [
        { slot: 0, dueAt: 1_000 },
        { slot: 1, dueAt: 500 },
      ]),
      bed("b", [{ slot: 0, dueAt: 900 }]),
    ];
    expect(chickenTarget(beds)).toEqual({ bedId: "a", slotIndex: 1 });
  });

  test("ignores unscheduled plots and greenhouse beds; empty farm is null", () => {
    const beds = [
      bed("g", [{ slot: 0 }], "greenhouse"),
      bed("a", [{ slot: 0 }]),
    ];
    expect(chickenTarget(beds)).toBeNull();
  });
});

describe("catTarget", () => {
  test("sleeps by the bed with the most total lapses", () => {
    const beds = [
      bed("a", [
        { slot: 0, dueAt: 1, lapses: 3 },
        { slot: 1, dueAt: 2, lapses: 2 },
      ]),
      bed("b", [{ slot: 0, dueAt: 3, lapses: 4 }]),
    ];
    expect(catTarget(beds)).toBe("a");
  });

  test("ties keep the first bed; no lapses anywhere still names a bed", () => {
    expect(catTarget([bed("a", [{ slot: 0 }]), bed("b", [{ slot: 0 }])])).toBe(
      "a"
    );
    expect(catTarget([])).toBeNull();
  });
});
