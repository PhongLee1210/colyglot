import type { BedView } from "@/lib/game/types";

// Animal utilities (GAME_PLAY §6.3): every animal does exactly ONE small
// thing — never power. Pure functions over the snapshot so the 3D layer
// stays dumb.

// The chicken pecks beside the crop that ripens next: the earliest dueAt
// among scheduled plots — overdue first, because that is the one to answer.
export function chickenTarget(
  beds: readonly BedView[]
): { bedId: string; slotIndex: number } | null {
  let best: { bedId: string; slotIndex: number; dueAt: number } | null = null;
  for (const bed of beds) {
    if (bed.kind !== "garden") continue;
    for (const plot of bed.plots) {
      if (!plot.schedule) continue;
      const dueAt = plot.schedule.dueAt.getTime();
      if (!best || dueAt < best.dueAt) {
        best = { bedId: bed.id, slotIndex: plot.slotIndex, dueAt };
      }
    }
  }
  return best ? { bedId: best.bedId, slotIndex: best.slotIndex } : null;
}

// The cat sleeps by the bed holding the most forgotten words — total
// lapses across its planted cards point at the player's weak spot.
export function catTarget(beds: readonly BedView[]): string | null {
  let best: { bedId: string; lapses: number } | null = null;
  for (const bed of beds) {
    if (bed.kind !== "garden") continue;
    let lapses = 0;
    for (const plot of bed.plots) {
      lapses += plot.schedule?.lapses ?? 0;
    }
    if (!best || lapses > best.lapses) {
      best = { bedId: bed.id, lapses };
    }
  }
  return best?.bedId ?? null;
}
