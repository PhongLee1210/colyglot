import type { FarmWorldSnapshot } from "@/lib/game/types";

type BedView = FarmWorldSnapshot["beds"][number];

function withBed(
  snapshot: FarmWorldSnapshot,
  bedId: string,
  map: (bed: BedView) => BedView
): FarmWorldSnapshot {
  return {
    ...snapshot,
    beds: snapshot.beds.map((bed) => (bed.id === bedId ? map(bed) : bed)),
  };
}

export function applyPlant(
  snapshot: FarmWorldSnapshot,
  bedId: string,
  hanzi: string,
  pinyin: string,
  translation: string
): FarmWorldSnapshot {
  let planted = false;
  const next = withBed(snapshot, bedId, (bed) => {
    const freeIndex = bed.plots.findIndex((plot) => plot.cardId === null);
    if (freeIndex === -1) return bed;
    planted = true;
    const plots = bed.plots.slice();
    plots[freeIndex] = {
      ...plots[freeIndex],
      cardId: `temp-${hanzi}`,
      hanzi,
      pinyin,
      translation,
      plantedAt: new Date(),
    };
    return { ...bed, plots };
  });
  return planted ? { ...next, freshCount: snapshot.freshCount + 1 } : snapshot;
}

export function applyGoldDelta(
  snapshot: FarmWorldSnapshot,
  delta: number
): FarmWorldSnapshot {
  return {
    ...snapshot,
    world: { ...snapshot.world, gold: snapshot.world.gold + delta },
  };
}

export function applyClaim(
  snapshot: FarmWorldSnapshot,
  claim: {
    goldAwarded: number;
    cardsHarvested: number;
    gold: number;
    streak?: number;
  }
): FarmWorldSnapshot {
  return {
    ...snapshot,
    streak: claim.streak ?? snapshot.streak,
    world: {
      ...snapshot.world,
      gold: claim.gold,
      stats: {
        planted: snapshot.world.stats.planted,
        harvested: snapshot.world.stats.harvested + claim.cardsHarvested,
        goldEarned: snapshot.world.stats.goldEarned + claim.goldAwarded,
      },
    },
  };
}

export function applyExpand(
  snapshot: FarmWorldSnapshot,
  bedId: string,
  plotCount: number,
  gold: number
): FarmWorldSnapshot {
  const next = withBed(snapshot, bedId, (bed) => {
    const plots = bed.plots.slice();
    while (plots.length < plotCount) {
      plots.push({
        slotIndex: plots.length,
        cardId: null,
        hanzi: null,
        pinyin: null,
        translation: null,
        plantedAt: null,
        variant: 0,
        schedule: null,
      });
    }
    return { ...bed, plotCount, plots };
  });
  return { ...next, world: { ...next.world, gold } };
}

export function rollbackPlant(
  snapshot: FarmWorldSnapshot,
  bedId: string,
  hanziList: string[]
): FarmWorldSnapshot {
  const hanziSet = new Set(hanziList);
  return withBed(snapshot, bedId, (bed) => ({
    ...bed,
    plots: bed.plots.map((plot) =>
      plot.cardId?.startsWith("temp-") && plot.hanzi && hanziSet.has(plot.hanzi)
        ? {
            ...plot,
            cardId: null,
            hanzi: null,
            pinyin: null,
            translation: null,
            plantedAt: null,
          }
        : plot
    ),
  }));
}
