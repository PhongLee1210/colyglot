"use client";

import { coachHint } from "@/lib/game/core/coach";
import type { FarmWorldSnapshot } from "@/lib/game/types";

export function GoalPill({
  snapshot,
  now,
}: {
  snapshot: FarmWorldSnapshot;
  now: Date | null;
}) {
  return (
    <p
      aria-live="polite"
      data-testid="goal-pill"
      className="pointer-events-none fixed left-1/2 top-[calc(var(--hud-top)+0.5rem)] z-20 max-w-[min(45rem,calc(100vw-1.5rem))] -translate-x-1/2 truncate rounded-full border border-white/30 bg-accent/85 px-4 py-1.5 text-center text-[13px] font-extrabold text-on-accent shadow-[0_6px_18px_rgb(0_0_0/0.25)] backdrop-blur-md"
    >
      🎯 {coachHint(snapshot, now)}
    </p>
  );
}
