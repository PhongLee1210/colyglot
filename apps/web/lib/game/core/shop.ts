// The shop (GAME_PLAY §6.3): two lanes of spending — capability (beds,
// regions, handled elsewhere) and this catalog, the farm-lane cosmetics.
// Prices are starting values: cheap first deco lands around day 4–5 of
// normal play (§10.2), the house ladder stretches into late game.

export type ShopCategory = "house" | "deco" | "animal";

export type ShopItem = {
  key: string;
  name: string;
  icon: string;
  blurb: string;
  price: number;
  category: ShopCategory;
  /** House tiers must be bought in order: 1, then 2, then 3. */
  houseTier?: number;
};

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    key: "fence_stone",
    name: "Stone Fence",
    icon: "🧱",
    blurb: "The front fence turns to cut stone.",
    price: 60,
    category: "deco",
  },
  {
    key: "path_stone",
    name: "Stone Path",
    icon: "🪨",
    blurb: "A proper paved walk from the gate.",
    price: 120,
    category: "deco",
  },
  {
    key: "lamp_post",
    name: "Lamp Posts",
    icon: "🏮",
    blurb: "Warm lamps light the path at dusk.",
    price: 240,
    category: "deco",
  },
  {
    key: "chicken",
    name: "Chicken",
    icon: "🐔",
    blurb: "Pecks beside the crop that ripens next.",
    price: 500,
    category: "animal",
  },
  {
    key: "cat",
    name: "Cat",
    icon: "🐈",
    blurb: "Sleeps by the bed you forget most.",
    price: 700,
    category: "animal",
  },
  {
    key: "house_1",
    name: "Cottage",
    icon: "🏠",
    blurb: "The shed grows into a cottage.",
    price: 300,
    category: "house",
    houseTier: 1,
  },
  {
    key: "house_2",
    name: "Farmhouse",
    icon: "🏡",
    blurb: "A porch, a chimney, room to stay.",
    price: 900,
    category: "house",
    houseTier: 2,
  },
  {
    key: "house_3",
    name: "Villa",
    icon: "🏛️",
    blurb: "The manor your memory built.",
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
