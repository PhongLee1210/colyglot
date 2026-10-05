// The shop (GAME_PLAY §6.3): two lanes of spending — capability (beds,
// regions, handled elsewhere) and this catalog, the farm-lane cosmetics.
// Prices are starting values: cheap first deco lands around day 4–5 of
// normal play (§10.2), the house ladder stretches into late game.

export type ShopCategory = "house" | "deco" | "animal";

export type ShopItem = {
  key: string;
  icon: string;
  price: number;
  category: ShopCategory;
  /** House tiers must be bought in order: 1, then 2, then 3. */
  houseTier?: number;
};

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    key: "fence_stone",
    icon: "🧱",
    price: 60,
    category: "deco",
  },
  {
    key: "path_stone",
    icon: "🪨",
    price: 120,
    category: "deco",
  },
  {
    key: "lamp_post",
    icon: "🏮",
    price: 240,
    category: "deco",
  },
  {
    key: "chicken",
    icon: "🐔",
    price: 500,
    category: "animal",
  },
  {
    key: "cat",
    icon: "🐈",
    price: 700,
    category: "animal",
  },
  {
    key: "house_1",
    icon: "🏠",
    price: 300,
    category: "house",
    houseTier: 1,
  },
  {
    key: "house_2",
    icon: "🏡",
    price: 900,
    category: "house",
    houseTier: 2,
  },
  {
    key: "house_3",
    icon: "🏛️",
    price: 2_500,
    category: "house",
    houseTier: 3,
  },
];

export function findShopItem(key: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.key === key);
}

// Highest owned house tier; 0 means the starter shed.
export function houseTierOwned(items: readonly { itemKey: string }[]): number {
  let tier = 0;
  for (const item of items) {
    const found = findShopItem(item.itemKey);
    if (found?.houseTier && found.houseTier > tier) {
      tier = found.houseTier;
    }
  }
  return tier;
}
