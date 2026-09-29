import type { PanelTabId } from "@/lib/game/store/hud-store";

export type PanelTab = {
  id: PanelTabId;
  icon: string;
  label: string;
  locked: boolean;
  teaser?: string;
};

// Locked tabs stay visible on purpose: the strip shows how much farm is
// still ahead instead of hiding it until the systems ship.
export const PANEL_TABS: PanelTab[] = [
  { id: "seeds", icon: "🌰", label: "Seeds", locked: false },
  { id: "progress", icon: "📊", label: "Progress", locked: false },
  {
    id: "missions",
    icon: "📜",
    label: "Missions",
    locked: true,
    teaser: "Daily goals that pay gold and XP for steady practice.",
  },
  {
    id: "orders",
    icon: "📋",
    label: "Orders",
    locked: true,
    teaser: "Villagers will request the words you have already mastered.",
  },
  {
    id: "workshop",
    icon: "🔬",
    label: "Workshop",
    locked: true,
    teaser: "Turn harvested words into sentences and stories.",
  },
  {
    id: "wonders",
    icon: "🏛️",
    label: "Wonders",
    locked: true,
    teaser: "Landmarks that mark every tier your farm has outgrown.",
  },
  {
    id: "neighbors",
    icon: "👥",
    label: "Neighbors",
    locked: true,
    teaser: "Visit other learners' farms and trade seed packs.",
  },
];

export function findPanelTab(id: PanelTabId): PanelTab {
  return PANEL_TABS.find((tab) => tab.id === id) ?? PANEL_TABS[0];
}
