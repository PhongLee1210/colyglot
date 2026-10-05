import type { PanelTabId } from "@/lib/game/store/hud-store";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type PanelTab = {
  id: PanelTabId;
  icon: string;
  locked: boolean;
};

// Locked tabs stay visible on purpose: the strip shows how much farm is
// still ahead instead of hiding it until the systems ship.
export const PANEL_TABS: PanelTab[] = [
  { id: "seeds", icon: "🌰", locked: false },
  { id: "shop", icon: "🛒", locked: false },
  { id: "progress", icon: "📊", locked: false },
  { id: "missions", icon: "📜", locked: true },
  { id: "orders", icon: "📋", locked: true },
  { id: "workshop", icon: "🔬", locked: true },
  { id: "wonders", icon: "🏛️", locked: true },
  { id: "neighbors", icon: "👥", locked: true },
];

export function findPanelTab(id: PanelTabId): PanelTab {
  return PANEL_TABS.find((tab) => tab.id === id) ?? PANEL_TABS[0];
}

export function panelTabText(
  t: Dictionary,
  id: PanelTabId
): { label: string; teaser: string } {
  return t.tabs[id];
}
