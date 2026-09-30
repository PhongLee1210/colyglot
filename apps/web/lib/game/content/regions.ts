// Regions (GAME_PLAY §5.3): each region is one topic + one landscape + its
// own cluster of beds. The player CHOOSES which region to open next, and
// the Market's dual gate (gold AND forest trees) is deliberate — trees
// cannot be ground for, so a region unlock is proof of memory, not wealth.

export type RegionKey = "homestead" | "market";

export type RegionDef = {
  key: RegionKey;
  name: string;
  icon: string;
  blurb: string;
  /** Gold the unlock charges; 0 for regions that come with the farm. */
  unlockGold: number;
  /** Forest trees required before the unlock is even offered (§5.3). */
  unlockTrees: number;
  /** Plots the region's first bed starts with. */
  startPlots: number;
  /** Seed packs whose words belong to this region's topic. */
  packKeys: string[];
  /** Name of the bed created when the region unlocks. */
  bedName: string;
};

export const REGIONS: readonly RegionDef[] = [
  {
    key: "homestead",
    name: "Homestead",
    icon: "🏡",
    blurb: "Numbers, greetings, family — the ground every farm starts on.",
    unlockGold: 0,
    unlockTrees: 0,
    startPlots: 6,
    packKeys: ["greetings"],
    bedName: "Homestead Garden",
  },
  {
    key: "market",
    name: "Market",
    icon: "🏮",
    blurb: "Food, shopping, prices — a busier topic for a busier farm.",
    unlockGold: 1_200,
    unlockTrees: 25,
    startPlots: 12,
    packKeys: ["food"],
    bedName: "Market Garden",
  },
];

export function getRegion(key: RegionKey): RegionDef {
  const region = REGIONS.find((item) => item.key === key);
  if (!region) {
    throw new RangeError(`Unknown region: ${key}`);
  }
  return region;
}

export function regionOfPack(packKey: string): RegionDef | undefined {
  return REGIONS.find((region) => region.packKeys.includes(packKey));
}

export function isRegionKey(value: string): value is RegionKey {
  return REGIONS.some((region) => region.key === value);
}

// Mastery (GAME_PLAY §7): a region counts as mastered once 80% of its
// words live in the Forest. Starting value 80% — the plaque is a marker,
// not a treadmill.
export const MASTERY_THRESHOLD = 0.8;

export function masteryOf(
  regionWords: readonly string[],
  forestHanzi: ReadonlySet<string>
): { pct: number; mastered: boolean } {
  if (regionWords.length === 0) {
    return { pct: 0, mastered: false };
  }
  const unique = new Set(regionWords);
  let grown = 0;
  for (const hanzi of unique) {
    if (forestHanzi.has(hanzi)) grown += 1;
  }
  const ratio = grown / unique.size;
  return { pct: Math.round(ratio * 100), mastered: ratio >= MASTERY_THRESHOLD };
}
