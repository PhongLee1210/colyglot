import type { RegionKey } from "@/lib/game/content";
import type { BedView } from "@/lib/game/types";

// Where a seed from `regionKey` lands (GAME_PLAY §5.3): the region's own
// garden beds, first one with a free slot. The greenhouse never takes
// seeds (§5.2). Returns the region's FIRST garden bed even when full, so
// the UI can say "expand the Market garden" instead of a dead end.
export function pickPlantingBed(
  beds: readonly BedView[],
  regionKey: RegionKey
): BedView | undefined {
  const gardens = beds.filter(
    (bed) => bed.kind === "garden" && bed.regionKey === regionKey
  );
  return (
    gardens.find((bed) => bed.plots.some((plot) => plot.cardId === null)) ??
    gardens[0]
  );
}
