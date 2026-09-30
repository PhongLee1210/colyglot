"use client";

import { DUE_SWEEP_LIMIT, type FarmWorldSnapshot } from "@/lib/game/types";

import { DockButton } from "./controls";

export function ActionDock({
  snapshot,
  disabled,
  onOpenSeeds,
  onOpenNursery,
  onOpenHarvest,
}: {
  snapshot: FarmWorldSnapshot;
  disabled: boolean;
  onOpenSeeds: () => void;
  onOpenNursery: () => void;
  onOpenHarvest: () => void;
}) {
  const dueBadge =
    snapshot.dueCount > DUE_SWEEP_LIMIT
      ? `${DUE_SWEEP_LIMIT}+`
      : snapshot.dueCount;
  return (
    <nav
      aria-label="Farm actions"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 gap-2 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <DockButton
        icon="🌰"
        label="Seeds"
        testId="dock-seeds"
        disabled={disabled}
        onClick={onOpenSeeds}
      />
      <DockButton
        icon="🌱"
        label="Nursery"
        testId="dock-nursery"
        ariaLabel={
          snapshot.freshCount > 0
            ? `Nursery, ${snapshot.freshCount} new seedlings`
            : undefined
        }
        badge={snapshot.freshCount}
        badgeTone="gold"
        disabled={disabled}
        onClick={onOpenNursery}
      />
      <DockButton
        icon="🧺"
        label="Harvest"
        testId="dock-harvest"
        ariaLabel={
          snapshot.dueCount > 0
            ? `Harvest, ${snapshot.dueCount} ready`
            : undefined
        }
        badge={dueBadge}
        tone={snapshot.dueCount > 0 ? "gold" : "default"}
        disabled={disabled}
        onClick={onOpenHarvest}
      />
    </nav>
  );
}
