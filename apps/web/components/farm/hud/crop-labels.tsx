"use client";

import { useMemo } from "react";

import { registerCropLabel } from "@/components/farm/farm-3d/crop-label-bridge";
import { cropStage } from "@/lib/game/core/crops";
import type { FarmWorldSnapshot } from "@/lib/game/types";
import { cn } from "@/lib/utils/cn";

type CropLabel = {
  key: string;
  hanzi: string;
  ripe: boolean;
  progress: number;
};

function growthProgress(
  plantedAt: Date | null,
  dueAt: Date | undefined,
  now: Date
): number {
  if (!plantedAt || !dueAt) return 0;
  const span = dueAt.getTime() - plantedAt.getTime();
  if (span <= 0) return 1;
  const elapsed = now.getTime() - plantedAt.getTime();
  return Math.min(1, Math.max(0, elapsed / span));
}

// Name tags floating over each planted plot, positioned every frame by
// CropLabelProjector — the farm answers "what is this word, how close is
// it?" without the player tapping anything.
export function CropLabels({
  snapshot,
  now,
}: {
  snapshot: FarmWorldSnapshot;
  now: Date | null;
}) {
  const labels = useMemo<CropLabel[]>(() => {
    if (!now) return [];
    return snapshot.beds.flatMap((bed) =>
      bed.plots.flatMap((plot) => {
        if (!plot.hanzi) return [];
        const stage = cropStage(plot.schedule, now);
        return [
          {
            key: `${bed.id}:${plot.slotIndex}`,
            hanzi: plot.hanzi,
            ripe: stage === "ready" || stage === "urgent",
            progress: growthProgress(plot.plantedAt, plot.schedule?.dueAt, now),
          },
        ];
      })
    );
  }, [snapshot, now]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
    >
      {labels.map((label) => (
        <div
          key={label.key}
          ref={(node) => {
            registerCropLabel(label.key, node);
          }}
          className={cn(
            "absolute left-0 top-0 min-w-10 rounded-lg border px-1.5 py-0.5 text-center opacity-0 shadow-[0_2px_6px_rgb(0_0_0/0.25)] backdrop-blur-sm will-change-transform",
            label.ripe
              ? "border-accent/70 bg-accent/85 text-on-accent"
              : "border-white/50 bg-white/75 text-fg"
          )}
        >
          <span className="block font-hanzi text-[13px] font-bold leading-tight">
            {label.hanzi}
          </span>
          <span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-black/20">
            <span
              className="block h-full rounded-full bg-green-500"
              style={{ width: `${Math.round(label.progress * 100)}%` }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}
