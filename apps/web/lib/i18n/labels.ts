import type { BedView } from "@/lib/game/types";

import type { Dictionary } from "@/lib/i18n/dictionaries";

// A bed's row carries the name it was created with, which is English and
// never changes. The label the player reads comes from the region and kind
// instead, so switching the interface language relabels every bed.
export function bedName(t: Dictionary, bed: BedView): string {
  return bed.kind === "greenhouse"
    ? t.beds.greenhouse
    : t.regions[bed.regionKey].bedName;
}
