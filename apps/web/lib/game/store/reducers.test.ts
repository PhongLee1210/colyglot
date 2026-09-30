import { describe, expect, test } from "bun:test";

import type { FarmWorldSnapshot } from "@/lib/game/types";
import {
  applyClaim,
  applyExpand,
  applyGoldDelta,
  applyPlant,
  rollbackPlant,
} from "./reducers";

function fixture(): FarmWorldSnapshot {
  return {
    world: {
      id: "w1",
      langKey: "zh-vi",
      tier: 0,
      gold: 40,
      stats: { planted: 1, harvested: 0, goldEarned: 0 },
    },
    beds: [
      {
        id: "b1",
        deckId: "d1",
        name: "Garden",
        plotCount: 6,
        position: 0,
        kind: "garden",
        regionKey: "homestead",
        plots: [
          {
            slotIndex: 0,
            cardId: "c1",
            hanzi: "你好",
            pinyin: "nǐ hǎo",
            translation: "xin chào",
            plantedAt: new Date(),
            variant: 0,
            schedule: null,
          },
          ...Array.from({ length: 5 }, (_, i) => ({
            slotIndex: i + 1,
            cardId: null,
            hanzi: null,
            pinyin: null,
            translation: null,
            plantedAt: null,
            variant: 0,
            schedule: null,
          })),
        ],
      },
    ],
    items: [],
    forest: [],
    streak: 0,
    longestStreak: 0,
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
    freshQueue: [],
    dueCount: 0,
    freshCount: 1,
    xp: 0,
    level: 1,
  };
}

describe("farm store transformers", () => {
  test("applyPlant fills the first empty slot with a temp card", () => {
    const next = applyPlant(fixture(), "b1", "谢谢", "xiè xie", "cảm ơn");
    expect(next.beds[0].plots[1].hanzi).toBe("谢谢");
    expect(next.beds[0].plots[1].cardId?.startsWith("temp-")).toBe(true);
    expect(next.freshCount).toBe(2);
  });

  test("applyPlant is a no-op when the bed is full", () => {
    const base = fixture();
    const full = {
      ...base,
      beds: [
        {
          ...base.beds[0],
          plots: base.beds[0].plots.map((p) => ({ ...p, cardId: "x" })),
        },
      ],
    };
    expect(applyPlant(full, "b1", "谢谢", "xiè xie", "cảm ơn")).toBe(full);
  });

  test("applyGoldDelta and applyClaim update gold", () => {
    expect(applyGoldDelta(fixture(), -20).world.gold).toBe(20);
    const claimed = applyClaim(fixture(), {
      goldAwarded: 8,
      cardsHarvested: 1,
      gold: 48,
    });
    expect(claimed.world.gold).toBe(48);
    expect(claimed.world.stats.goldEarned).toBe(8);
    expect(claimed.world.stats.harvested).toBe(1);
  });

  test("applyExpand grows plotCount and gold", () => {
    const next = applyExpand(fixture(), "b1", 9, 20);
    expect(next.beds[0].plotCount).toBe(9);
    expect(next.beds[0].plots).toHaveLength(9);
    expect(next.world.gold).toBe(20);
  });

  test("rollbackPlant removes optimistic temp plots", () => {
    const planted = applyPlant(fixture(), "b1", "谢谢", "xiè xie", "cảm ơn");
    const rolledBack = rollbackPlant(planted, "b1", ["谢谢"]);
    expect(rolledBack.beds[0].plots[1].hanzi).toBeNull();
  });
});
