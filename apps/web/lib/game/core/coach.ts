import { waitSpan, type WaitSpan } from "@/lib/game/core/crops";
import type { FarmWorldSnapshot } from "@/lib/game/types";

// The single most useful next move, named but not worded — the dictionary
// turns it into a sentence so the pill speaks the player's language.
export type CoachHint =
  | { kind: "ripe"; count: number }
  | { kind: "fresh"; count: number }
  | { kind: "nothingPlanted" }
  | { kind: "emptyPlots"; count: number }
  | { kind: "growingUntil"; wait: WaitSpan }
  | { kind: "growing" };

// Ordered the way the loop rewards: harvest what is ripe, meet new words,
// fill empty ground, then wait. It mirrors the farm state only — no stored
// progress.
export function coachHint(
  snapshot: FarmWorldSnapshot,
  now: Date | null
): CoachHint {
  if (snapshot.dueCount > 0) {
    return { kind: "ripe", count: snapshot.dueCount };
  }
  if (snapshot.freshCount > 0) {
    return { kind: "fresh", count: snapshot.freshCount };
  }

  const plots = snapshot.beds.flatMap((bed) => bed.plots);
  const planted = plots.filter((plot) => plot.cardId !== null);
  if (planted.length === 0) {
    return { kind: "nothingPlanted" };
  }

  const freeSlots = plots.length - planted.length;
  if (freeSlots > 0) {
    return { kind: "emptyPlots", count: freeSlots };
  }

  const nextDueAt = planted
    .map((plot) => plot.schedule?.dueAt)
    .filter((dueAt): dueAt is Date => dueAt !== undefined)
    .sort((left, right) => left.getTime() - right.getTime())[0];
  if (nextDueAt && now) {
    return { kind: "growingUntil", wait: waitSpan(nextDueAt, now) };
  }
  return { kind: "growing" };
}
