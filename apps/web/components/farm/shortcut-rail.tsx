"use client";

import { useCameraStore } from "@/lib/game/store/camera-store";
import { useHudStore } from "@/lib/game/store/hud-store";
import { useT } from "@/lib/i18n/use-t";

import { RailButton } from "./hud/controls";

// The vertical rail sits beside the side panel and owns the two things a
// player reaches for while the farm is on screen: what the panel shows,
// and where the camera is pointing.
export function ShortcutRail() {
  const t = useT();
  const openTab = useHudStore((state) => state.openTab);
  const togglePanel = useHudStore((state) => state.togglePanel);
  const resetCamera = useCameraStore((state) => state.reset);

  return (
    <nav
      aria-label={t.rail.ariaShortcuts}
      className="fixed right-2 top-[calc(var(--hud-top)+3.5rem)] z-30 flex gap-2 sm:right-3 sm:top-1/2 sm:-translate-y-1/2 sm:flex-col"
    >
      <RailButton
        icon="📋"
        label={t.rail.farmPanel}
        active={openTab !== null}
        onClick={() => togglePanel()}
      />
      <RailButton
        icon="📊"
        label={t.rail.progress}
        active={openTab === "progress"}
        onClick={() => togglePanel("progress")}
      />
      <RailButton
        icon="🎯"
        label={t.rail.recenterCamera}
        onClick={resetCamera}
      />
    </nav>
  );
}
