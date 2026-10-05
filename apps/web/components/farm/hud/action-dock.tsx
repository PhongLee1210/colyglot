"use client";

import { DUE_SWEEP_LIMIT, type FarmWorldSnapshot } from "@/lib/game/types";
import { useT } from "@/lib/i18n/use-t";

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
  const t = useT();
  const dueBadge =
    snapshot.dueCount > DUE_SWEEP_LIMIT
      ? `${DUE_SWEEP_LIMIT}+`
      : snapshot.dueCount;
  return (
    <nav
      aria-label={t.dock.ariaActions}
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 gap-2 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <DockButton
        icon="🌰"
        label={t.dock.seeds}
        testId="dock-seeds"
        disabled={disabled}
        onClick={onOpenSeeds}
      />
      <DockButton
        icon="🌱"
        label={t.dock.nursery}
        testId="dock-nursery"
        ariaLabel={
          snapshot.freshCount > 0
            ? t.dock.ariaNursery(snapshot.freshCount)
            : undefined
        }
        badge={snapshot.freshCount}
        badgeTone="gold"
        disabled={disabled}
        onClick={onOpenNursery}
      />
      <DockButton
        icon="🧺"
        label={t.dock.harvest}
        testId="dock-harvest"
        ariaLabel={
          snapshot.dueCount > 0
            ? t.dock.ariaHarvest(snapshot.dueCount)
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
