import { formatWait } from "@/lib/game/core/crops";
import type { FarmWorldSnapshot } from "@/lib/game/types";

// One sentence naming the single most useful next move, in the order the
// loop rewards: harvest what is ripe, meet new words, fill empty ground,
// then wait. It mirrors the farm state only — no stored progress.
export function coachHint(
  snapshot: FarmWorldSnapshot,
  now: Date | null
): string {
  if (snapshot.dueCount > 0) {
    return snapshot.dueCount === 1
      ? "1 crop is ripe — harvest it to lock the word in"
      : `${snapshot.dueCount} crops are ripe — harvest them to lock the words in`;
  }
  if (snapshot.freshCount > 0) {
    return snapshot.freshCount === 1
      ? "1 new seedling is waiting in the nursery"
      : `${snapshot.freshCount} new seedlings are waiting in the nursery`;
  }

  const plots = snapshot.beds.flatMap((bed) => bed.plots);
  const planted = plots.filter((plot) => plot.cardId !== null);
  if (planted.length === 0) {
    return "Tap Seeds to plant your first words";
  }

  const freeSlots = plots.length - planted.length;
  if (freeSlots > 0) {
    return freeSlots === 1
      ? "1 plot is empty — plant another word"
      : `${freeSlots} plots are empty — plant more words`;
  }

  const nextDueAt = planted
    .map((plot) => plot.schedule?.dueAt)
    .filter((dueAt): dueAt is Date => dueAt !== undefined)
    .sort((left, right) => left.getTime() - right.getTime())[0];
  if (nextDueAt && now) {
    return `Every plot is growing — next harvest in ${formatWait(nextDueAt, now)}`;
  }
  return "Every plot is growing — come back soon";
}
