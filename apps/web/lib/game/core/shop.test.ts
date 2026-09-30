import { describe, expect, test } from "bun:test";

import { findShopItem, houseTierOwned, SHOP_ITEMS } from "@/lib/game/core/shop";

describe("shop catalog", () => {
  test("v1 ships house tiers, deco and two animals at GAME_PLAY §6.3 prices", () => {
    expect(findShopItem("house_1")).toMatchObject({ price: 300, houseTier: 1 });
    expect(findShopItem("house_2")).toMatchObject({ price: 900, houseTier: 2 });
    expect(findShopItem("house_3")).toMatchObject({
      price: 2_500,
      houseTier: 3,
    });
    expect(findShopItem("fence_stone")).toMatchObject({ price: 60 });
    expect(findShopItem("path_stone")).toMatchObject({ price: 120 });
    expect(findShopItem("lamp_post")).toMatchObject({ price: 240 });
    expect(findShopItem("chicken")).toMatchObject({
      price: 500,
      category: "animal",
    });
    expect(findShopItem("cat")).toMatchObject({
      price: 700,
      category: "animal",
    });
    // Deco lives inside the §6.3 band 60–400.
    for (const item of SHOP_ITEMS.filter((i) => i.category === "deco")) {
      expect(item.price).toBeGreaterThanOrEqual(60);
      expect(item.price).toBeLessThanOrEqual(400);
    }
    expect(findShopItem("nope")).toBeUndefined();
  });

  test("houseTierOwned reads the highest owned tier", () => {
    expect(houseTierOwned([])).toBe(0);
    expect(
      houseTierOwned([{ itemKey: "fence_stone" }, { itemKey: "house_1" }])
    ).toBe(1);
    expect(
      houseTierOwned([{ itemKey: "house_3" }, { itemKey: "house_1" }])
    ).toBe(3);
  });
});
