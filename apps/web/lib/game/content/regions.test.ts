import { describe, expect, test } from "bun:test";

import { LANG_PACKS } from "@/lib/game/content";

import { getRegion, masteryOf, regionOfPack, REGIONS } from "./regions";

describe("regions", () => {
  test("v1 ships Homestead free and Market behind the dual gate", () => {
    expect(REGIONS).toHaveLength(2);
    const homestead = getRegion("homestead");
    expect(homestead.unlockGold).toBe(0);
    expect(homestead.unlockTrees).toBe(0);
    expect(homestead.startPlots).toBe(6);

    const market = getRegion("market");
    expect(market.unlockGold).toBe(1_200);
    expect(market.unlockTrees).toBe(25);
    expect(market.startPlots).toBe(12);
  });

  test("every seed pack belongs to exactly one region", () => {
    const packKeys = (LANG_PACKS["zh-vi"]?.packs ?? []).map((pack) => pack.key);
    expect(packKeys.length).toBeGreaterThan(0);
    for (const key of packKeys) {
      const region = regionOfPack(key);
      expect(region, `pack ${key} has no region`).toBeDefined();
      // Homestead and Market own disjoint packs (GAME_PLAY §5.3).
      expect(REGIONS.filter((r) => r.packKeys.includes(key))).toHaveLength(1);
    }
  });

  test("regionOfPack maps the built-in packs", () => {
    expect(regionOfPack("greetings")?.key).toBe("homestead");
    expect(regionOfPack("food")?.key).toBe("market");
    expect(regionOfPack("nope")).toBeUndefined();
  });

  test("mastery needs 80% of the region's words in the Forest (§7)", () => {
    const words = ["一", "二", "三", "四", "五"];
    expect(masteryOf(words, new Set())).toEqual({ pct: 0, mastered: false });
    // 4 of 5 = 80% — exactly at the threshold.
    expect(masteryOf(words, new Set(["一", "二", "三", "四"]))).toEqual({
      pct: 80,
      mastered: true,
    });
    // 3 of 5 = 60%.
    expect(masteryOf(words, new Set(["一", "二", "三"]))).toEqual({
      pct: 60,
      mastered: false,
    });
    // Duplicates in the word list never inflate the count.
    expect(masteryOf([...words, "一"], new Set(["一"]))).toEqual({
      pct: 20,
      mastered: false,
    });
    expect(masteryOf([], new Set(["一"]))).toEqual({ pct: 0, mastered: false });
  });
});
