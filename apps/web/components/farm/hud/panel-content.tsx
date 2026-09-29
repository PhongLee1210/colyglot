"use client";

import { useHudStore } from "@/lib/game/store/hud-store";
import type { FarmWorldSnapshot } from "@/lib/game/types";

import { panelCardClass } from "./controls";
import { ProgressTab } from "./progress-tab";
import { SeedsTab } from "./seeds-tab";
import { findPanelTab, type PanelTab } from "./tabs";

export function PanelContent({
  snapshot,
  streak,
  tierName,
}: {
  snapshot: FarmWorldSnapshot;
  streak: number;
  tierName: string;
}) {
  const openTab = useHudStore((state) => state.openTab);
  if (!openTab) return null;

  const tab = findPanelTab(openTab);
  if (tab.locked) {
    return <LockedTab tab={tab} />;
  }
  if (tab.id === "seeds") {
    return <SeedsTab />;
  }
  return (
    <ProgressTab snapshot={snapshot} streak={streak} tierName={tierName} />
  );
}

function LockedTab({ tab }: { tab: PanelTab }) {
  return (
    <div
      className={`flex flex-col items-center gap-2 text-center ${panelCardClass}`}
    >
      <span aria-hidden="true" className="text-4xl">
        {tab.icon}
      </span>
      <h3 className="font-display text-base font-extrabold">{tab.label}</h3>
      <p className="text-sm text-fg-muted">{tab.teaser}</p>
      <p className="rounded-full bg-black/10 px-3 py-1 text-xs font-bold text-fg-muted dark:bg-white/10">
        Coming soon
      </p>
    </div>
  );
}
